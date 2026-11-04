import { describe, expect, it } from "vitest";
import type { PullRequest } from "../../shared/types";
import { apiBase, GitLabProvider, neutraliseQuickActions } from "./gitlab";
import { ProviderError, type ReviewSubmission } from "./types";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers });
const empty = () => new Response(null, { status: 204 });

const mr = (iid: number, over: object = {}) => ({
  iid,
  title: `MR ${iid}`,
  description: "fixes #7",
  web_url: `https://gitlab.com/group/sub/proj/-/merge_requests/${iid}`,
  updated_at: "2026-01-01T00:00:00Z",
  sha: "head",
  prepared_at: "2026-01-01T00:00:00Z",
  target_branch: "main",
  source_branch: "feat",
  author: { username: "maya" },
  references: { full: `group/sub/proj!${iid}` },
  ...over,
});
const samplePr: PullRequest = {
  key: "a:group/sub/proj!1",
  accountId: "a",
  provider: "gitlab",
  repo: "group/sub/proj",
  number: 1,
  title: "t",
  author: "maya",
  url: "",
  description: "See #7 and #1",
  baseRef: "main",
  headRef: "feat",
  baseSha: "",
  headSha: "head",
  additions: 0,
  deletions: 0,
  updatedAt: "",
};
const MR = "https://gitlab.com/api/v4/projects/group%2Fsub%2Fproj/merge_requests/1";
const VERSIONS = [
  { head_commit_sha: "newer", base_commit_sha: "b2", start_commit_sha: "s2" },
  { head_commit_sha: "head", base_commit_sha: "b1", start_commit_sha: "s1" },
];
const submission = (over: Partial<ReviewSubmission> = {}): ReviewSubmission => ({
  event: "comment",
  body: "Summary",
  comments: [
    { path: "new.ts", oldPath: "old.ts", line: 4, oldLine: 3, body: "On an unchanged line" },
    { path: "new.ts", oldPath: "old.ts", line: 9, body: "On an added line" },
  ],
  ...over,
});

/** A fake GitLab that keeps draft notes, so tests can see what is left behind. */
function fakeGitLab(options: { existingDrafts?: boolean; refuse?: (url: string, method: string) => Response | undefined; unpublishable?: string[] } = {}) {
  const calls: { method: string; url: string; body?: Record<string, unknown> }[] = [];
  const drafts = new Map<number, Record<string, unknown>>();
  if (options.existingDrafts) drafts.set(500, { note: "The user's own draft" });
  let nextId = 1;
  const published: Record<string, unknown>[] = [];
  const notes: Record<string, unknown>[] = [];
  const fetchMock = (async (input: string, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    calls.push({ method, url, ...(body ? { body } : {}) });
    const refused = options.refuse?.(url, method);
    if (refused) return refused;
    const path = url.split("?")[0]!;
    if (path === `${MR}/versions`) return json(VERSIONS);
    if (path === `${MR}/draft_notes` && method === "GET") return json([...drafts.keys()].map((id) => ({ id })));
    if (path === `${MR}/draft_notes` && method === "POST") {
      const id = nextId++;
      drafts.set(id, body!);
      return json({ id }, 201);
    }
    if (path === `${MR}/draft_notes/bulk_publish`) {
      for (const [id, d] of drafts) {
        if (options.unpublishable?.includes(String(d.note))) continue;
        published.push(d);
        drafts.delete(id);
      }
      return empty();
    }
    if (path.startsWith(`${MR}/draft_notes/`) && method === "DELETE") {
      drafts.delete(Number(path.split("/").pop()));
      return empty();
    }
    if (path === `${MR}/notes` && method === "POST") {
      notes.push(body!);
      return json({ id: 900 }, 201);
    }
    if (path === `${MR}/approve`) return json({ approved: true }, 201);
    if (path === `${MR}/approvals`) return json({ user_has_approved: false });
    return json({ message: `404 ${path}` }, 404);
  }) as typeof fetch;
  return { fetchMock, calls, drafts, published, notes, provider: new GitLabProvider("gitlab.com", "t", fetchMock) };
}

describe("neutraliseQuickActions", () => {
  it("stops every line that GitLab would run as a command", () => {
    expect(neutraliseQuickActions("/merge")).toBe("\\/merge");
    expect(neutraliseQuickActions("Looks fine.\n/approve\n/MERGE\r\n/close now")).toBe("Looks fine.\n\\/approve\n\\/MERGE\r\n\\/close now");
  });
  it("leaves ordinary text alone", () => {
    const text = "See /etc/hosts and a/b.\n// a comment\n/ alone";
    expect(neutraliseQuickActions(text)).toBe(text);
  });
});

describe("GitLabProvider listing", () => {
  it("merges review requests and assignments without duplicates, across nested groups", async () => {
    const urls: string[] = [];
    const fetchMock = (async (input: string) => {
      urls.push(String(input));
      return json(String(input).includes("reviewer_username") ? [mr(1)] : [mr(1), mr(2)]);
    }) as typeof fetch;
    const prs = await new GitLabProvider("gitlab.com", "t", fetchMock).listAssigned("me", "acct");
    expect(prs.map((p) => p.number)).toEqual([1, 2]);
    expect(prs[0]).toMatchObject({ key: "acct:group/sub/proj!1", repo: "group/sub/proj", provider: "gitlab", headSha: "head", baseRef: "main", author: "maya" });
    expect(urls.every((u) => u.includes("scope=all") && u.includes("state=opened"))).toBe(true);
  });
  it("skips merge requests GitLab hasn't prepared yet", async () => {
    const fetchMock = (async () => json([mr(1, { sha: null }), mr(2, { prepared_at: null }), mr(3, { prepared_at: undefined })])) as unknown as typeof fetch;
    const prs = await new GitLabProvider("gitlab.com", "t", fetchMock).listAssigned("me", "acct");
    expect(prs.map((p) => p.number)).toEqual([3]);
  });
  it("follows pages", async () => {
    const pages: string[] = [];
    const fetchMock = (async (input: string) => {
      pages.push(new URL(String(input)).searchParams.get("page")!);
      return pages.length === 1
        ? json([{ path_with_namespace: "g/a", visibility: "private" }], 200, { "x-next-page": "2" })
        : json([{ path_with_namespace: "g/b", visibility: "public" }], 200, { "x-next-page": "" });
    }) as typeof fetch;
    const repos = await new GitLabProvider("gitlab.com", "t", fetchMock).listRepositories("acct");
    expect(pages).toEqual(["1", "2"]);
    expect(repos).toEqual([{ accountId: "acct", name: "g/a", isPrivate: true }, { accountId: "acct", name: "g/b", isPrivate: false }]);
  });
  it("sends the token and explains a rejected one", async () => {
    let headers: Record<string, string> = {};
    const fetchMock = (async (_: string, init: RequestInit) => {
      headers = init.headers as Record<string, string>;
      return json({ message: "401 Unauthorized" }, 401);
    }) as typeof fetch;
    const provider = new GitLabProvider("gitlab.com", "secret", fetchMock);
    await expect(provider.verify()).rejects.toThrow(/rejected this token/);
    await expect(provider.verify()).rejects.toBeInstanceOf(ProviderError);
    expect(headers["PRIVATE-TOKEN"]).toBe("secret");
  });
  it("explains a token that lacks the api permission", async () => {
    const fetchMock = (async () => json({ error: "insufficient_scope", error_description: "needs api" }, 403)) as unknown as typeof fetch;
    await expect(new GitLabProvider("gitlab.com", "t", fetchMock).verify()).rejects.toThrow(/api permission/);
  });
});

describe("GitLabProvider details", () => {
  const fetchFor = (diffRefs: unknown) =>
    (async (input: string) => {
      const url = String(input);
      if (url.includes("/notes")) return json([{ author: { username: "sam" }, body: "Why?", system: false }, { author: null, body: "added 1 commit", system: true }]);
      if (url.includes("/issues/7")) return json({ title: "Bug", description: "Details" });
      return json({ diff_refs: diffRefs });
    }) as typeof fetch;

  it("uses GitLab's merge base, drops system notes and reads linked issues", async () => {
    const details = await new GitLabProvider("gitlab.com", "t", fetchFor({ base_sha: "mb" })).getDetails(samplePr);
    expect(details.mergeBaseSha).toBe("mb");
    expect(details.comments).toEqual([{ author: "sam", body: "Why?" }]);
    expect(details.linkedIssues).toEqual([{ reference: "#7", title: "Bug", body: "Details" }]);
  });
  it("says so when the diff isn't ready", async () => {
    await expect(new GitLabProvider("gitlab.com", "t", fetchFor(null)).getDetails(samplePr)).rejects.toThrow(/still preparing/);
  });
  it("fetches over https with a token that stays out of the URL", () => {
    const remote = new GitLabProvider("gitlab.example.com:8443", "secret", fetch).gitRemote(samplePr);
    expect(remote.url).toBe("https://gitlab.example.com:8443/group/sub/proj.git");
    expect(remote.url).not.toContain("secret");
    expect(Buffer.from(remote.authHeader.replace("Authorization: Basic ", ""), "base64").toString()).toBe("oauth2:secret");
  });
  it("targets a self-hosted server's API", () => {
    expect(apiBase("gitlab.example.com")).toBe("https://gitlab.example.com/api/v4");
  });
});

describe("GitLabProvider sending", () => {
  it("places comments using the version that was reviewed, not the newest one", async () => {
    const g = fakeGitLab();
    await g.provider.submitReview(samplePr, submission());
    const created = g.published.map((d) => d.position as Record<string, unknown> | undefined);
    expect(created[0]).toBeUndefined();
    expect(created[1]).toMatchObject({ position_type: "text", base_sha: "b1", start_sha: "s1", head_sha: "head", old_path: "old.ts", new_path: "new.ts", new_line: 4, old_line: 3 });
    expect(created[2]).toMatchObject({ new_line: 9 });
    expect(created[2]).not.toHaveProperty("old_line");
    expect(g.published.map((d) => d.note)).toEqual(["Summary", "On an unchanged line", "On an added line"]);
    expect(g.drafts.size).toBe(0);
  });
  it("sets a review state only when changes are requested", async () => {
    const stateFor = async (event: ReviewSubmission["event"]) => {
      const g = fakeGitLab();
      await g.provider.submitReview(samplePr, submission({ event }));
      return g.calls.find((c) => c.url.endsWith("bulk_publish"))!.body;
    };
    expect(await stateFor("request_changes")).toEqual({ reviewer_state: "requested_changes" });
    expect(await stateFor("comment")).toEqual({});
    expect(await stateFor("approve")).toEqual({});
  });
  it("won't run commands hidden in review text, in any posted note", async () => {
    const g = fakeGitLab({ unpublishable: ["\\/close"] });
    await g.provider.submitReview(samplePr, submission({ body: "/merge", comments: [{ path: "a", line: 1, body: "/close" }] }));
    expect(g.published[0]!.note).toBe("\\/merge");
    expect(String(g.notes[0]!.body)).toContain("\\/close");
    expect(JSON.stringify(g.calls)).not.toMatch(/"(note|body)":"\/(merge|close)/);
  });
  it("refuses a commit GitLab has no version for, and posts nothing", async () => {
    const g = fakeGitLab();
    await expect(g.provider.submitReview({ ...samplePr, headSha: "gone" }, submission())).rejects.toThrow(/changed since/);
    expect(g.calls.some((c) => c.method !== "GET")).toBe(false);
  });
  it("won't publish drafts the user is still writing", async () => {
    const g = fakeGitLab({ existingDrafts: true });
    await expect(g.provider.submitReview(samplePr, submission())).rejects.toThrow(/unsent draft/);
    expect(g.calls.some((c) => c.method !== "GET")).toBe(false);
    expect(g.drafts.has(500)).toBe(true);
  });
  it("removes its drafts when a comment is refused, so a retry can't double post", async () => {
    let posts = 0;
    const g = fakeGitLab({
      refuse: (url, method) => (url.endsWith("/draft_notes") && method === "POST" && ++posts === 3 ? json({ message: "bad position" }, 400) : undefined),
    });
    await expect(g.provider.submitReview(samplePr, submission())).rejects.toThrow(/bad position/);
    expect(g.drafts.size).toBe(0);
    expect(g.published).toEqual([]);
  });
  it("removes its drafts when publishing fails", async () => {
    const g = fakeGitLab({ refuse: (url) => (url.endsWith("bulk_publish") ? json({ message: "boom" }, 500) : undefined) });
    await expect(g.provider.submitReview(samplePr, submission())).rejects.toThrow(/boom/);
    expect(g.drafts.size).toBe(0);
  });
  it("posts a comment GitLab couldn't place as a plain note, so it isn't lost", async () => {
    const g = fakeGitLab({ unpublishable: ["On an added line"] });
    await g.provider.submitReview(samplePr, submission());
    expect(g.published).toHaveLength(2);
    expect(String(g.notes[0]!.body)).toContain("new.ts, line 9");
    expect(String(g.notes[0]!.body)).toContain("On an added line");
    expect(g.drafts.size).toBe(0);
  });
  it("says what happened when the rescue fails too, and keeps the comment as a draft", async () => {
    const g = fakeGitLab({
      unpublishable: ["On an added line"],
      refuse: (url, method) => (url.endsWith("/notes") && method === "POST" ? json({ message: "no" }, 500) : undefined),
    });
    await expect(g.provider.submitReview(samplePr, submission())).rejects.toThrow(/review was posted.*refused 1/);
    expect(g.drafts.size).toBe(1);
  });

  describe("approving", () => {
    const approveFails = (status: number) => (url: string) => (url.endsWith("/approve") ? json({ message: "x" }, status) : undefined);

    it("approves the reviewed commit before publishing", async () => {
      const g = fakeGitLab();
      await g.provider.submitReview(samplePr, submission({ event: "approve" }));
      const order = g.calls.filter((c) => c.method === "POST").map((c) => c.url.split("/").pop());
      expect(order.indexOf("approve")).toBeLessThan(order.indexOf("bulk_publish"));
      expect(g.calls.find((c) => c.url.endsWith("/approve"))!.body).toEqual({ sha: "head" });
    });
    it("posts nothing when the user isn't allowed to approve", async () => {
      const g = fakeGitLab({ refuse: approveFails(401) });
      await expect(g.provider.submitReview(samplePr, submission({ event: "approve" }))).rejects.toThrow(/refused your approval/);
      expect(g.published).toEqual([]);
      expect(g.drafts.size).toBe(0);
    });
    it("carries on when the user has already approved, so a retry works", async () => {
      const g = fakeGitLab({
        refuse: (url) => (url.endsWith("/approve") ? json({ message: "401" }, 401) : url.endsWith("/approvals") ? json({ user_has_approved: true }) : undefined),
      });
      await g.provider.submitReview(samplePr, submission({ event: "approve" }));
      expect(g.published).toHaveLength(3);
    });
    it("explains new commits and posts nothing", async () => {
      const g = fakeGitLab({ refuse: approveFails(409) });
      await expect(g.provider.submitReview(samplePr, submission({ event: "approve" }))).rejects.toThrow(/new commits/);
      expect(g.published).toEqual([]);
      expect(g.drafts.size).toBe(0);
    });
  });
});
