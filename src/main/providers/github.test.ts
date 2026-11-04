import { describe, expect, it } from "vitest";
import type { PullRequest } from "../../shared/types";
import { apiBase, GitHubProvider, linkedIssueNumbers } from "./github";
import { ProviderError } from "./types";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const pull = (number: number) => ({
  number,
  title: `PR ${number}`,
  body: "fixes #7",
  html_url: `https://github.com/o/r/pull/${number}`,
  updated_at: "2026-01-01T00:00:00Z",
  additions: 1,
  deletions: 2,
  user: { login: "maya" },
  base: { ref: "main", sha: "base", repo: { full_name: "o/r" } },
  head: { ref: "feat", sha: "head" },
});
const samplePr: PullRequest = {
  key: "a:o/r#1",
  accountId: "a",
  provider: "github",
  repo: "o/r",
  number: 1,
  title: "t",
  author: "maya",
  url: "",
  description: "See #7 and #1",
  baseRef: "main",
  headRef: "feat",
  baseSha: "base",
  headSha: "head",
  additions: 0,
  deletions: 0,
  updatedAt: "",
};

describe("GitHubProvider", () => {
  it("merges review requests and assignments without duplicates", async () => {
    const urls: string[] = [];
    const fetchMock = (async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("/search/issues")) {
        const items = decodeURIComponent(url).includes("review-requested")
          ? [{ number: 1, repository_url: "https://api.github.com/repos/o/r" }]
          : [{ number: 1, repository_url: "https://api.github.com/repos/o/r" }, { number: 2, repository_url: "https://api.github.com/repos/o/r" }];
        return json({ items });
      }
      return json(pull(Number(url.split("/").pop())));
    }) as typeof fetch;
    const prs = await new GitHubProvider("github.com", "t", fetchMock).listAssigned("me", "acct");
    expect(prs.map((p) => p.number).sort()).toEqual([1, 2]);
    expect(prs[0]!.key).toBe("acct:o/r#1");
    expect(urls.filter((u) => u.includes("/pulls/")).length).toBe(2);
  });

  it("still lists other projects when one repository refuses access", async () => {
    const fetchMock = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/search/issues")) {
        return json({ items: [{ number: 1, repository_url: "https://api.github.com/repos/o/r" }, { number: 2, repository_url: "https://api.github.com/repos/o/locked" }] });
      }
      if (url.includes("/o/locked/")) return json({ message: "Forbidden" }, 403);
      return json(pull(1));
    }) as typeof fetch;
    const prs = await new GitHubProvider("github.com", "t", fetchMock).listAssigned("me", "acct");
    expect(prs.map((p) => p.repo)).toEqual(["o/r"]);
  });

  it("reports the failure when no PR can be read at all", async () => {
    const fetchMock = (async (input: RequestInfo | URL) =>
      String(input).includes("/search/issues")
        ? json({ items: [{ number: 2, repository_url: "https://api.github.com/repos/o/locked" }] })
        : json({ message: "Forbidden" }, 403)) as typeof fetch;
    await expect(new GitHubProvider("github.com", "t", fetchMock).listAssigned("me", "acct")).rejects.toThrow(/denied access/);
  });

  it("lists every page of repositories and skips archived ones", async () => {
    const urls: string[] = [];
    const fetchMock = (async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      if (url.endsWith("page=1")) return json(Array.from({ length: 100 }, (_, i) => ({ full_name: `o/r${i}`, private: i === 0 })));
      return json([{ full_name: "o/last", private: false }, { full_name: "o/old", private: false, archived: true }]);
    }) as typeof fetch;
    const repos = await new GitHubProvider("github.com", "t", fetchMock).listRepositories("acct");
    expect(repos).toHaveLength(101);
    expect(repos[0]).toEqual({ accountId: "acct", name: "o/r0", isPrivate: true });
    expect(repos.some((r) => r.name === "o/old")).toBe(false);
    expect(urls).toHaveLength(2);
  });

  it("explains a rejected token plainly", async () => {
    const provider = new GitHubProvider("github.com", "bad", (async () => json({ message: "Bad credentials" }, 401)) as typeof fetch);
    await expect(provider.verify()).rejects.toThrow(/rejected this token/);
    await expect(provider.verify()).rejects.toBeInstanceOf(ProviderError);
  });

  it("sends the review pinned to the reviewed commit", async () => {
    let sent: { url: string; body: Record<string, unknown> } | undefined;
    const fetchMock = (async (input: RequestInfo | URL, init?: RequestInit) => {
      sent = { url: String(input), body: JSON.parse(String(init?.body)) };
      return json({});
    }) as typeof fetch;
    await new GitHubProvider("github.com", "t", fetchMock).submitReview(samplePr, {
      event: "request_changes",
      body: "Summary",
      comments: [{ path: "a.ts", line: 3, body: "c" }],
    });
    expect(sent!.url).toBe("https://api.github.com/repos/o/r/pulls/1/reviews");
    expect(sent!.body).toEqual({
      commit_id: "head",
      event: "REQUEST_CHANGES",
      body: "Summary",
      comments: [{ path: "a.ts", line: 3, side: "RIGHT", body: "c" }],
    });
  });

  it("keeps going when a mentioned number is not an issue", async () => {
    const fetchMock = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/compare/")) return json({ merge_base_commit: { sha: "mb" } });
      if (url.includes("/comments")) return json([]);
      return json({ message: "Not Found" }, 404);
    }) as typeof fetch;
    const details = await new GitHubProvider("github.com", "t", fetchMock).getDetails(samplePr);
    expect(details.mergeBaseSha).toBe("mb");
    expect(details.linkedIssues).toEqual([{ reference: "#7", title: "", body: "" }]);
  });
});

describe("helpers", () => {
  it("uses the Enterprise API path for company servers", () => {
    expect(apiBase("github.com")).toBe("https://api.github.com");
    expect(apiBase("git.acme.com")).toBe("https://git.acme.com/api/v3");
  });
  it("finds linked issues but not the PR itself or anchors in links", () => {
    expect(linkedIssueNumbers("fixes #12, see (#34) and #5. http://x/y#99", 5)).toEqual([12, 34]);
  });
});
