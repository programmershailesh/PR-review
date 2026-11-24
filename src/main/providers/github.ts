import type { PullRequest, RepoInfo, SendEvent } from "../../shared/types";
import { ProviderError, type GitProvider, type PrDetails, type ReviewSubmission } from "./types";

type FetchLike = typeof fetch;

const EVENT: Record<SendEvent, string> = {
  request_changes: "REQUEST_CHANGES",
  comment: "COMMENT",
  approve: "APPROVE",
};
const MAX_LINKED_ISSUES = 5;
const MAX_REPO_PAGES = 20;

export function apiBase(host: string): string {
  return host === "github.com" ? "https://api.github.com" : `https://${host}/api/v3`;
}

interface PullJson {
  number: number;
  state?: "open" | "closed";
  merged_at?: string | null;
  title: string;
  body: string | null;
  html_url: string;
  updated_at: string;
  additions: number;
  deletions: number;
  user: { login: string } | null;
  base: { ref: string; sha: string; repo: { full_name: string } };
  head: { ref: string; sha: string };
}

export class GitHubProvider implements GitProvider {
  constructor(
    private readonly host: string,
    private readonly token: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${apiBase(this.host)}${path}`, {
        ...init,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${this.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "Code-Reviewer-Desktop",
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
        },
      });
    } catch {
      throw new ProviderError(`Couldn't reach ${this.host}. Check your internet connection.`);
    }
    if (!res.ok) throw new ProviderError(await this.describeError(res), res.status);
    return (await res.json()) as T;
  }

  private async describeError(res: Response): Promise<string> {
    let detail = "";
    try {
      const body = (await res.json()) as { message?: string; errors?: unknown[] };
      detail = body.message ?? "";
      if (Array.isArray(body.errors) && body.errors.length) detail += ` (${JSON.stringify(body.errors).slice(0, 300)})`;
    } catch {
      // The status alone is enough.
    }
    if (res.status === 401) return "GitHub rejected this token. It may be expired or mistyped.";
    if (res.status === 403 && /rate limit/i.test(detail)) return "GitHub's rate limit was reached. Code Reviewer will try again shortly.";
    if (res.status === 403 || res.status === 404) {
      return `GitHub denied access. The token may not have permission for this repository. ${detail}`.trim();
    }
    return `GitHub returned an error (${res.status}). ${detail}`.trim();
  }

  async verify(): Promise<string> {
    const me = await this.request<{ login: string }>("/user");
    return me.login;
  }

  async listAssigned(username: string, accountId: string): Promise<PullRequest[]> {
    const queries = [`is:open is:pr archived:false review-requested:${username}`, `is:open is:pr archived:false assignee:${username}`];
    const found = new Map<string, { repo: string; number: number }>();
    for (const q of queries) {
      const data = await this.request<{ items: { number: number; repository_url: string }[] }>(
        `/search/issues?per_page=100&sort=updated&q=${encodeURIComponent(q)}`,
      );
      for (const item of data.items) {
        const repo = item.repository_url.split("/repos/")[1] ?? "";
        found.set(`${repo}#${item.number}`, { repo, number: item.number });
      }
    }
    const results = await Promise.allSettled(
      [...found.values()].map(({ repo, number }) => this.request<PullJson>(`/repos/${repo}/pulls/${number}`)),
    );
    const pulls = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    // One repository refusing access must not hide PRs from the others.
    const firstFailure = results.find((r) => r.status === "rejected");
    if (!pulls.length && firstFailure?.status === "rejected") throw firstFailure.reason;
    return pulls.map((p) => this.toPullRequest(p, accountId));
  }

  async listRepositories(accountId: string): Promise<RepoInfo[]> {
    const repos: RepoInfo[] = [];
    for (let page = 1; page <= MAX_REPO_PAGES; page++) {
      const batch = await this.request<{ full_name: string; private: boolean; archived?: boolean }[]>(
        `/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member&page=${page}`,
      );
      for (const r of batch) if (!r.archived) repos.push({ accountId, name: r.full_name, isPrivate: r.private });
      if (batch.length < 100) break;
    }
    return repos;
  }

  async getPullRequest(repo: string, number: number, accountId: string): Promise<PullRequest> {
    return this.toPullRequest(await this.request<PullJson>(`/repos/${repo}/pulls/${number}`), accountId);
  }

  private toPullRequest(p: PullJson, accountId: string): PullRequest {
    const repo = p.base.repo.full_name;
    return {
      key: `${accountId}:${repo}#${p.number}`,
      accountId,
      provider: "github",
      repo,
      number: p.number,
      title: p.title,
      author: p.user?.login ?? "unknown",
      url: p.html_url,
      description: p.body ?? "",
      baseRef: p.base.ref,
      headRef: p.head.ref,
      baseSha: p.base.sha,
      headSha: p.head.sha,
      additions: p.additions,
      deletions: p.deletions,
      updatedAt: p.updated_at,
      status: p.merged_at ? "merged" : p.state === "closed" ? "closed" : "open",
    };
  }

  async getDetails(pr: PullRequest): Promise<PrDetails> {
    const compare = await this.request<{ merge_base_commit: { sha: string } }>(
      `/repos/${pr.repo}/compare/${pr.baseSha}...${pr.headSha}?per_page=1`,
    );
    const comments = await this.request<{ user: { login: string } | null; body: string | null }[]>(
      `/repos/${pr.repo}/issues/${pr.number}/comments?per_page=50`,
    );
    const linkedIssues: PrDetails["linkedIssues"] = [];
    for (const number of linkedIssueNumbers(pr.description, pr.number).slice(0, MAX_LINKED_ISSUES)) {
      try {
        const issue = await this.request<{ title: string; body: string | null }>(`/repos/${pr.repo}/issues/${number}`);
        linkedIssues.push({ reference: `#${number}`, title: issue.title, body: issue.body ?? "" });
      } catch {
        // A mention like "#12" may not be an issue here. project-context treats absent issues as unavailable.
        linkedIssues.push({ reference: `#${number}`, title: "", body: "" });
      }
    }
    return {
      mergeBaseSha: compare.merge_base_commit.sha,
      linkedIssues,
      comments: comments.map((c) => ({ author: c.user?.login ?? "unknown", body: c.body ?? "" })),
    };
  }

  async submitReview(pr: PullRequest, review: ReviewSubmission): Promise<void> {
    await this.request(`/repos/${pr.repo}/pulls/${pr.number}/reviews`, {
      method: "POST",
      body: JSON.stringify({
        commit_id: pr.headSha,
        event: EVENT[review.event],
        body: review.body,
        comments: review.comments.map((c) => ({ path: c.path, line: c.line, side: "RIGHT", body: c.body })),
      }),
    });
  }

  gitRemote(pr: PullRequest): { url: string; authHeader: string } {
    const basic = Buffer.from(`x-access-token:${this.token}`).toString("base64");
    return { url: `https://${this.host}/${pr.repo}.git`, authHeader: `Authorization: Basic ${basic}` };
  }
}

/** Issue numbers mentioned in a PR description, such as "fixes #12" or "#34". */
export function linkedIssueNumbers(description: string, selfNumber: number): number[] {
  const numbers = new Set<number>();
  for (const m of description.matchAll(/(?:^|[\s(])#(\d{1,7})\b/g)) {
    const n = Number(m[1]);
    if (n !== selfNumber) numbers.add(n);
  }
  return [...numbers];
}

export type { ReviewSubmission };
