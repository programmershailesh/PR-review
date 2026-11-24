import type { PullRequest, RepoInfo } from "../../shared/types";
import { linkedIssueNumbers } from "./github";
import { ProviderError, type GitProvider, type InlineComment, type PrDetails, type ReviewSubmission } from "./types";

type FetchLike = typeof fetch;

const MAX_LINKED_ISSUES = 5;
const MAX_PAGES = 20;

export function apiBase(host: string): string {
  return `https://${host}/api/v4`;
}

/**
 * GitLab runs a line such as "/merge" or "/approve" in a note as a command, under the
 * sender's account. Review text can quote the merge request, which is untrusted, so
 * every such line is escaped. It still displays as "/merge", except inside a code block.
 */
export function neutraliseQuickActions(text: string): string {
  return text.replace(/^\/(?=[a-z])/gim, "\\/");
}

interface MergeRequestJson {
  iid: number;
  state?: "opened" | "merged" | "closed" | "locked";
  diff_refs?: { head_sha: string } | null;
  title: string;
  description: string | null;
  web_url: string;
  updated_at: string;
  sha: string | null;
  prepared_at?: string | null;
  target_branch: string;
  source_branch: string;
  author: { username: string } | null;
  references: { full: string };
}

interface VersionJson {
  head_commit_sha: string;
  base_commit_sha: string;
  start_commit_sha: string;
}

export class GitLabProvider implements GitProvider {
  constructor(
    private readonly host: string,
    private readonly token: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  private async send(path: string, init?: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${apiBase(this.host)}${path}`, {
        ...init,
        headers: {
          "PRIVATE-TOKEN": this.token,
          "User-Agent": "Code-Reviewer-Desktop",
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
        },
      });
    } catch {
      throw new ProviderError(`Couldn't reach ${this.host}. Check your internet connection.`);
    }
    if (!res.ok) throw new ProviderError(await this.describeError(res), res.status);
    return res;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.send(path, init);
    // Publishing and deleting drafts answer with no content.
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }

  private async all<T>(path: string): Promise<T[]> {
    const items: T[] = [];
    const joiner = path.includes("?") ? "&" : "?";
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await this.send(`${path}${joiner}per_page=100&page=${page}`);
      items.push(...((await res.json()) as T[]));
      if (!res.headers.get("x-next-page")) break;
    }
    return items;
  }

  private async describeError(res: Response): Promise<string> {
    let detail = "";
    let code = "";
    try {
      const body = (await res.json()) as { message?: unknown; error?: string; error_description?: string };
      code = body.error ?? "";
      const message = body.message ?? body.error_description ?? code;
      detail = typeof message === "string" ? message : JSON.stringify(message).slice(0, 300);
    } catch {
      // The status alone is enough.
    }
    if (res.status === 401) return "GitLab rejected this token. It may be expired or mistyped.";
    if (res.status === 429) return "GitLab's rate limit was reached. Code Reviewer will try again shortly.";
    if (res.status === 403 && code === "insufficient_scope") return "This token doesn't have the api permission that Code Reviewer needs.";
    if (res.status === 403 || res.status === 404) {
      return `GitLab denied access. The token may not have permission for this project. ${detail}`.trim();
    }
    return `GitLab returned an error (${res.status}). ${detail}`.trim();
  }

  async verify(): Promise<string> {
    const me = await this.request<{ username: string }>("/user");
    return me.username;
  }

  async listAssigned(username: string, accountId: string): Promise<PullRequest[]> {
    const user = encodeURIComponent(username);
    const lists = await Promise.all(
      [`reviewer_username=${user}`, `assignee_username=${user}`].map((filter) =>
        this.all<MergeRequestJson>(`/merge_requests?state=opened&scope=all&${filter}`),
      ),
    );
    const found = new Map<string, PullRequest>();
    for (const mr of lists.flat()) {
      // A new merge request has no diff until GitLab prepares it. The next refresh picks it up.
      if (!mr.sha || mr.prepared_at === null) continue;
      const pr = this.toPullRequest(mr, accountId);
      found.set(pr.key, pr);
    }
    return [...found.values()];
  }

  async getPullRequest(repo: string, number: number, accountId: string): Promise<PullRequest> {
    const mr = await this.request<MergeRequestJson>(`${this.project({ repo })}/merge_requests/${number}`);
    if (!mr.sha && !mr.diff_refs) throw new ProviderError("GitLab is still preparing this merge request. Try again in a moment.");
    return this.toPullRequest(mr, accountId);
  }

  async listRepositories(accountId: string): Promise<RepoInfo[]> {
    const projects = await this.all<{ path_with_namespace: string; visibility?: string }>(
      "/projects?membership=true&archived=false&order_by=last_activity_at",
    );
    return projects.map((p) => ({ accountId, name: p.path_with_namespace, isPrivate: p.visibility !== "public" }));
  }

  private toPullRequest(mr: MergeRequestJson, accountId: string): PullRequest {
    const repo = mr.references.full.slice(0, mr.references.full.lastIndexOf("!"));
    return {
      key: `${accountId}:${repo}!${mr.iid}`,
      accountId,
      provider: "gitlab",
      repo,
      number: mr.iid,
      title: mr.title,
      author: mr.author?.username ?? "unknown",
      url: mr.web_url,
      description: mr.description ?? "",
      baseRef: mr.target_branch,
      headRef: mr.source_branch,
      // GitLab's list has no base commit or line counts. getDetails finds the base when a review runs.
      baseSha: "",
      headSha: (mr.sha ?? mr.diff_refs?.head_sha) as string,
      additions: 0,
      deletions: 0,
      updatedAt: mr.updated_at,
      status: mr.state === "merged" ? "merged" : mr.state === "closed" || mr.state === "locked" ? "closed" : "open",
    };
  }

  private project(pr: Pick<PullRequest, "repo">): string {
    return `/projects/${encodeURIComponent(pr.repo)}`;
  }

  private mergeRequest(pr: PullRequest): string {
    return `${this.project(pr)}/merge_requests/${pr.number}`;
  }

  async getDetails(pr: PullRequest): Promise<PrDetails> {
    const mr = await this.request<{ diff_refs: { base_sha: string } | null }>(this.mergeRequest(pr));
    if (!mr.diff_refs) throw new ProviderError("GitLab is still preparing this merge request. Try again in a moment.");
    const notes = await this.request<{ author: { username: string } | null; body: string | null; system: boolean }[]>(
      `${this.mergeRequest(pr)}/notes?per_page=50&sort=asc`,
    );
    const linkedIssues: PrDetails["linkedIssues"] = [];
    for (const number of linkedIssueNumbers(pr.description, pr.number).slice(0, MAX_LINKED_ISSUES)) {
      try {
        const issue = await this.request<{ title: string; description: string | null }>(`${this.project(pr)}/issues/${number}`);
        linkedIssues.push({ reference: `#${number}`, title: issue.title, body: issue.description ?? "" });
      } catch {
        // A mention like "#12" may not be an issue here. project-context treats absent issues as unavailable.
        linkedIssues.push({ reference: `#${number}`, title: "", body: "" });
      }
    }
    return {
      mergeBaseSha: mr.diff_refs.base_sha,
      linkedIssues,
      // System notes record events such as "added 1 commit". They aren't anyone's comment.
      comments: notes.filter((n) => !n.system).map((n) => ({ author: n.author?.username ?? "unknown", body: n.body ?? "" })),
    };
  }

  /**
   * GitLab has no single call that posts a review, so it's built from draft notes. They stay
   * private until published, so a problem partway through leaves nothing on the merge request,
   * and a retry can't post the same comments twice.
   */
  async submitReview(pr: PullRequest, review: ReviewSubmission): Promise<void> {
    const mr = this.mergeRequest(pr);
    const version = (await this.all<VersionJson>(`${mr}/versions`)).find((v) => v.head_commit_sha === pr.headSha);
    if (!version) throw new ProviderError("This merge request has changed since it was reviewed. Review it again before sending.");

    // Publishing sends all of the user's drafts, and nothing may post without their say-so.
    const pending = await this.request<unknown[]>(`${mr}/draft_notes?per_page=1`);
    if (pending.length) {
      throw new ProviderError("You have unsent draft comments on this merge request in GitLab. Submit or delete them there, then send again. Nothing was posted.");
    }

    const summary: number[] = [];
    const inline = new Map<number, InlineComment>();
    const ids = () => [...summary, ...inline.keys()];
    try {
      const first = await this.post<{ id: number }>(`${mr}/draft_notes`, { note: neutraliseQuickActions(review.body) });
      summary.push(first.id);
      for (const comment of review.comments) {
        const draft = await this.post<{ id: number }>(`${mr}/draft_notes`, {
          note: neutraliseQuickActions(comment.body),
          position: {
            position_type: "text",
            base_sha: version.base_commit_sha,
            start_sha: version.start_commit_sha,
            head_sha: version.head_commit_sha,
            old_path: comment.oldPath ?? comment.path,
            new_path: comment.path,
            new_line: comment.line,
            // GitLab needs both numbers on an unchanged line, and only new_line on an added one.
            ...(comment.oldLine === undefined ? {} : { old_line: comment.oldLine }),
          },
        });
        inline.set(draft.id, comment);
      }
      // Approving comes first, because it's what GitLab is most likely to refuse.
      if (review.event === "approve") await this.approve(mr, pr.headSha);
      // "Comment" sets no review state. On GitLab, "reviewed" also lifts the user's own earlier
      // request for changes, and a plain comment shouldn't unblock a merge.
      await this.post(`${mr}/draft_notes/bulk_publish`, review.event === "request_changes" ? { reviewer_state: "requested_changes" } : {});
    } catch (err) {
      await this.deleteDrafts(mr, ids());
      throw err;
    }
    await this.rescueUnpublished(mr, inline);
  }

  private async approve(mr: string, sha: string): Promise<void> {
    try {
      await this.post(`${mr}/approve`, { sha });
    } catch (err) {
      const status = err instanceof ProviderError ? err.status : undefined;
      if (status === 409) throw new ProviderError("This merge request has new commits, so GitLab won't accept an approval of the reviewed version. Review it again. Nothing was posted.", 409);
      if (status !== 401) throw err;
      // GitLab answers 401 both when the user can't approve and when they already have.
      const state = await this.request<{ user_has_approved?: boolean }>(`${mr}/approvals`);
      if (state.user_has_approved) return;
      throw new ProviderError("GitLab refused your approval. You may be the author, not an eligible approver, or the project may ask for your password. Nothing was posted, so you can send this as a comment instead.", 401);
    }
  }

  /** GitLab publishes a review even when some comments fail, and keeps those as drafts. They must not vanish. */
  private async rescueUnpublished(mr: string, inline: Map<number, InlineComment>): Promise<void> {
    const remaining = await this.all<{ id: number }>(`${mr}/draft_notes`).catch(() => []);
    const failed = remaining.flatMap((d) => {
      const comment = inline.get(d.id);
      return comment ? [{ id: d.id, comment }] : [];
    });
    if (!failed.length) return;
    const body = failed.map(({ comment }) => `**${comment.path}, line ${comment.line}**\n\n${comment.body}`).join("\n\n---\n\n");
    try {
      await this.post(`${mr}/notes`, { body: neutraliseQuickActions(body) });
    } catch {
      throw new ProviderError(`Your review was posted, but GitLab refused ${failed.length} of its comments. They're saved as your drafts on the merge request.`);
    }
    await this.deleteDrafts(mr, failed.map((f) => f.id));
  }

  private async deleteDrafts(mr: string, ids: number[]): Promise<void> {
    // Best effort. This must not hide the error that made cleaning up necessary.
    await Promise.allSettled(ids.map((id) => this.request(`${mr}/draft_notes/${id}`, { method: "DELETE" })));
  }

  gitRemote(pr: PullRequest): { url: string; authHeader: string } {
    // The target project also serves commits from forks, through its merge request refs.
    const basic = Buffer.from(`oauth2:${this.token}`).toString("base64");
    return { url: `https://${this.host}/${pr.repo}.git`, authHeader: `Authorization: Basic ${basic}` };
  }
}
