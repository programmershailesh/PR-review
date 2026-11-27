import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_PROJECTS, type PullRequest, type ReviewResult } from "../shared/types";
import { AppCore } from "./app-core";
import { ProviderError, type GitProvider, type ReviewSubmission } from "./providers/types";
import { Store } from "./store";

const mocks = vi.hoisted(() => ({
  claudeOk: true,
  runReview: vi.fn(),
  bundleInputs: [] as Record<string, unknown>[],
}));
vi.mock("./claude/auth", () => ({
  checkClaude: async () => (mocks.claudeOk ? { ok: true, found: true, subscriptionType: "max" } : { ok: false, found: true, message: "Not signed in." }),
}));
vi.mock("./claude/find", () => ({ findClaude: () => ({ command: "claude", prefixArgs: [] }) }));
vi.mock("./claude/runner", () => ({ runReview: mocks.runReview }));
vi.mock("./review/bundle", () => ({
  prepareBundle: async (input: Record<string, unknown>) => (mocks.bundleInputs.push(input), { dir: "bundle", diff: "diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-a\n+b\n" }),
  removeBundle: async () => undefined,
}));

const result = { verdict: "approve", summary: "Fine.", findings: [{ file: "a.ts", line: 1, title: "t", problem: "p", impact: "i", betterApproach: "b", severity: "minor" }] } as unknown as ReviewResult;
const pr = (n: number, sha = "sha1"): PullRequest => ({
  key: `acct:o/r#${n}`, accountId: "acct", provider: "github", repo: "o/r", number: n, title: `PR ${n}`, author: "a", url: "", description: "",
  baseRef: "main", headRef: "f", baseSha: "b", headSha: sha, additions: 0, deletions: 0, updatedAt: "",
});
// Each run includes real disk writes, which can take a while when the whole suite runs in parallel.
const flush = () => new Promise((r) => setTimeout(r, 60));

let dir: string;
let assigned: PullRequest[];
let listError: Error | undefined;
let submitError: Error | undefined;
let submitted: ReviewSubmission[];
let lookup: PullRequest[];
let lookupError: Error | undefined;
let core: AppCore;
let store: Store;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "code-reviewer-core-"));
  assigned = [pr(1)];
  listError = undefined;
  submitError = undefined;
  submitted = [];
  lookup = [];
  lookupError = undefined;
  mocks.bundleInputs = [];
  mocks.claudeOk = true;
  mocks.runReview.mockReset();
  mocks.runReview.mockResolvedValue(result);
  store = new Store(path.join(dir, "state.json"));
  store.data.accounts.push({ id: "acct", provider: "github", host: "github.com", username: "me" });
  store.data.tokens.acct = "enc:token";
  const provider: GitProvider = {
    verify: async () => "me",
    listAssigned: async () => {
      if (listError) throw listError;
      return assigned;
    },
    listRepositories: async () => [{ accountId: "acct", name: "o/idle", isPrivate: false }],
    getPullRequest: async (repo, number) => {
      if (lookupError) throw lookupError;
      const found = lookup.find((p) => p.repo === repo && p.number === number);
      if (!found) throw new ProviderError("GitHub denied access.", 404);
      return found;
    },
    getDetails: async () => ({ mergeBaseSha: "b", linkedIssues: [], comments: [] }),
    submitReview: async (_p, r) => {
      if (submitError) throw submitError;
      submitted.push(r);
    },
    gitRemote: () => ({ url: "x", authHeader: "" }),
  };
  core = new AppCore({
    store,
    userData: dir,
    enginePath: path.resolve(__dirname, "../../review-engine"),
    encrypt: (t) => `enc:${t}`,
    decrypt: (b) => b.replace("enc:", ""),
    notify: () => undefined,
    emit: () => undefined,
    providerFactory: () => provider,
  });
});

afterEach(() => {
  core.stop();
  rmSync(dir, { recursive: true, force: true });
});

describe("review queue", () => {
  it("reviews a newly assigned PR, without posting anything", async () => {
    await core.start();
    await flush();
    expect(mocks.runReview).toHaveBeenCalledTimes(1);
    expect(core.state().reviews[pr(1).key]?.state).toBe("ready");
    expect(submitted).toEqual([]);
  });

  it("runs one review at a time", async () => {
    assigned = [pr(1), pr(2)];
    let release!: (r: ReviewResult) => void;
    mocks.runReview.mockImplementationOnce(() => new Promise((res) => (release = res)));
    await core.start();
    await flush();
    expect(mocks.runReview).toHaveBeenCalledTimes(1);
    expect(core.state().reviews[pr(2).key]?.state).toBe("queued");
    release(result);
    await flush();
    expect(mocks.runReview).toHaveBeenCalledTimes(2);
  });

  it("doesn't review the same commit twice", async () => {
    await core.start();
    await flush();
    await core.refresh();
    await flush();
    expect(mocks.runReview).toHaveBeenCalledTimes(1);
  });

  it("reviews again when new commits arrive", async () => {
    await core.start();
    await flush();
    assigned = [pr(1, "sha2")];
    await core.refresh();
    await flush();
    expect(mocks.runReview).toHaveBeenCalledTimes(2);
    expect(core.state().reviews[pr(1).key]?.headSha).toBe("sha2");
  });

  it("doesn't keep retrying a failed review and using up the subscription", async () => {
    mocks.runReview.mockRejectedValue(new Error("Your Claude usage limit has been reached."));
    await core.start();
    await flush();
    await core.refresh();
    await flush();
    expect(mocks.runReview).toHaveBeenCalledTimes(1);
    expect(core.state().reviews[pr(1).key]).toMatchObject({ state: "failed", error: expect.stringContaining("usage limit") });
  });

  it("waits, and runs nothing, while Claude Code isn't ready", async () => {
    mocks.claudeOk = false;
    await core.start();
    await flush();
    expect(mocks.runReview).not.toHaveBeenCalled();
    expect(core.state().reviews[pr(1).key]?.state).toBe("queued");
    mocks.claudeOk = true;
    await core.checkClaude();
    await flush();
    expect(mocks.runReview).toHaveBeenCalledTimes(1);
  });

  it("respects automatic reviews being turned off", async () => {
    store.data.settings.autoStart = false;
    await core.start();
    await flush();
    expect(mocks.runReview).not.toHaveBeenCalled();
    await core.startReview(pr(1).key);
    await flush();
    expect(mocks.runReview).toHaveBeenCalledTimes(1);
  });
});

describe("running in the background", () => {
  it("finishes every queued review while the window is closed, then reports idle", async () => {
    assigned = [pr(1), pr(2)];
    let release!: (r: ReviewResult) => void;
    mocks.runReview.mockImplementationOnce(() => new Promise((res) => (release = res)));
    const onIdle = vi.fn();
    (core as unknown as { deps: { onIdle: () => void } }).deps.onIdle = onIdle;
    await core.start();
    await flush();
    expect(core.hasWork()).toBe(true);
    core.setBackground(true);
    release(result);
    await flush();
    expect(core.state().reviews[pr(1).key]?.state).toBe("ready");
    expect(core.state().reviews[pr(2).key]?.state).toBe("ready");
    expect(core.hasWork()).toBe(false);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("doesn't pick up new work while the window is closed", async () => {
    await core.start();
    await flush();
    core.setBackground(true);
    assigned = [pr(1), pr(2)];
    await core.refresh();
    await flush();
    expect(mocks.runReview).toHaveBeenCalledTimes(1);
    expect(core.state().prs).toHaveLength(1);
    core.setBackground(false);
    await core.refresh();
    await flush();
    expect(mocks.runReview).toHaveBeenCalledTimes(2);
  });

  it("doesn't count reviews that can't run as work, so the app can't get stuck open", async () => {
    mocks.claudeOk = false;
    await core.start();
    await flush();
    expect(core.state().reviews[pr(1).key]?.state).toBe("queued");
    expect(core.hasWork()).toBe(false);
  });

  it("resumes a review after quitting mid-run, rather than marking it failed", async () => {
    mocks.runReview.mockImplementationOnce(({ signal }: { signal: AbortSignal }) => new Promise((_res, rej) => {
      signal.addEventListener("abort", () => rej(new Error("cancelled")));
    }));
    await core.start();
    await flush();
    core.stop();
    await flush();
    const review = core.state().reviews[pr(1).key];
    expect(review?.state).toBe("running");
    expect(review?.error).toBeUndefined();
    const reopened = new Store(path.join(dir, "state.json"));
    reopened.recoverInterrupted();
    expect(reopened.data.reviews[pr(1).key]?.state).toBe("queued");
  });
});

describe("projects and priority", () => {
  const inRepo = (repo: string, n: number): PullRequest => ({ ...pr(n), repo, key: `acct:${repo}#${n}` });
  const reviewedRepos = () => mocks.runReview.mock.calls.length;

  it("reviews in priority order, whatever order PRs arrive in", async () => {
    assigned = [inRepo("o/low", 1), inRepo("o/high", 2), inRepo("o/mid", 3)];
    store.data.projectOrder = ["o/high", "o/mid", "o/low"];
    const started: string[] = [];
    const real = core.state.bind(core);
    mocks.runReview.mockImplementation(async () => {
      started.push(real().prs.find((p) => real().reviews[p.key]?.state === "running")!.repo);
      return result;
    });
    await core.start();
    await flush();
    await flush();
    expect(started).toEqual(["o/high", "o/mid", "o/low"]);
  });

  it("never interrupts a running review for a higher priority one", async () => {
    assigned = [inRepo("o/low", 1)];
    let release!: (r: ReviewResult) => void;
    mocks.runReview.mockImplementationOnce(() => new Promise((res) => (release = res)));
    await core.start();
    await flush();
    assigned = [inRepo("o/low", 1), inRepo("o/high", 2)];
    core.setProjectOrder(["o/high", "o/low"]);
    await core.refresh();
    await flush();
    expect(core.state().reviews[inRepo("o/low", 1).key]?.state).toBe("running");
    expect(core.state().reviews[inRepo("o/high", 2).key]?.state).toBe("queued");
    release(result);
    await flush();
    expect(core.state().reviews[inRepo("o/low", 1).key]?.state).toBe("ready");
  });

  it("shows but doesn't review a project that is turned off", async () => {
    store.data.projects["o/skip"] = { enabled: false };
    assigned = [inRepo("o/skip", 1)];
    await core.start();
    await flush();
    expect(core.state().prs).toHaveLength(1);
    expect(reviewedRepos()).toBe(0);
    expect(core.state().reviews[inRepo("o/skip", 1).key]).toBeUndefined();
  });

  it("only reviews chosen projects when new projects are off", async () => {
    store.data.settings.reviewNewProjects = false;
    assigned = [inRepo("o/new", 1)];
    await core.start();
    await flush();
    expect(reviewedRepos()).toBe(0);
    core.setProjectEnabled("o/new", true);
    await flush();
    expect(reviewedRepos()).toBe(1);
  });

  it("drops waiting reviews and stops the running one when a project is turned off", async () => {
    assigned = [inRepo("o/a", 1), inRepo("o/a", 2)];
    let aborted = false;
    mocks.runReview.mockImplementationOnce(({ signal }: { signal: AbortSignal }) => new Promise((_res, rej) => {
      signal.addEventListener("abort", () => {
        aborted = true;
        rej(new Error("cancelled"));
      });
    }));
    await core.start();
    await flush();
    core.setProjectEnabled("o/a", false);
    await flush();
    expect(aborted).toBe(true);
    expect(core.state().reviews).toEqual({});
    expect(reviewedRepos()).toBe(1);
  });

  it("keeps finished reviews when a project is turned off", async () => {
    await core.start();
    await flush();
    core.setProjectEnabled("o/r", false);
    expect(core.state().reviews[pr(1).key]?.state).toBe("ready");
  });

  it("still allows a one-off review in a turned-off project, ahead of the queue", async () => {
    store.data.projects["o/skip"] = { enabled: false };
    assigned = [inRepo("o/skip", 1)];
    await core.start();
    await flush();
    await core.startReview(inRepo("o/skip", 1).key);
    await flush();
    expect(reviewedRepos()).toBe(1);
    await core.refresh();
    expect(core.state().reviews[inRepo("o/skip", 1).key]?.state).toBe("ready");
  });

  it("removes a turned-off project from the priority list", async () => {
    core.setProjectEnabled("o/a", true);
    core.setProjectEnabled("o/b", true);
    expect(core.state().projectOrder).toEqual(["o/a", "o/b"]);
    core.setProjectEnabled("o/a", false);
    expect(core.state().projectOrder).toEqual(["o/b"]);
  });

  it("lists all repositories, even with nothing assigned", async () => {
    assigned = [];
    await core.start();
    await flush();
    expect(core.state().repositories.map((r) => r.name)).toEqual(["o/idle"]);
  });
});

describe("refreshing", () => {
  it("keeps finished reviews when the network fails, and says why", async () => {
    await core.start();
    await flush();
    listError = new Error("Couldn't reach github.com.");
    await core.refresh();
    const state = core.state();
    expect(state.prs).toHaveLength(1);
    expect(state.reviews[pr(1).key]?.state).toBe("ready");
    expect(state.accounts[0]?.error).toContain("Couldn't reach");
  });

  it("drops a PR that is no longer assigned", async () => {
    await core.start();
    await flush();
    assigned = [];
    await core.refresh();
    expect(core.state().prs).toHaveLength(0);
    expect(core.state().reviews[pr(1).key]).toBeUndefined();
  });

  it("keeps a sent review visible after GitHub removes the request", async () => {
    await core.start();
    await flush();
    await core.sendReview(pr(1).key, "approve");
    assigned = [];
    await core.refresh();
    expect(core.state().prs).toHaveLength(1);
    expect(core.state().reviews[pr(1).key]?.state).toBe("sent");
  });
});

describe("sending", () => {
  it("posts only when asked, and honours what the user turned off", async () => {
    await core.start();
    await flush();
    core.updateDraft(pr(1).key, 0, { included: false });
    await core.sendReview(pr(1).key, "comment");
    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toMatchObject({ event: "comment", comments: [] });
  });

  it("can't send twice", async () => {
    await core.start();
    await flush();
    await core.sendReview(pr(1).key, "approve");
    await expect(core.sendReview(pr(1).key, "approve")).rejects.toThrow(/isn't ready/);
    expect(submitted).toHaveLength(1);
  });

  it("stays ready to retry when the provider refuses", async () => {
    await core.start();
    await flush();
    submitError = new Error("GitHub returned an error (422).");
    await expect(core.sendReview(pr(1).key, "request_changes")).rejects.toThrow(/422/);
    expect(core.state().reviews[pr(1).key]?.state).toBe("ready");
    submitError = undefined;
    await core.sendReview(pr(1).key, "comment");
    expect(core.state().reviews[pr(1).key]).toMatchObject({ state: "sent", sentAs: "comment" });
  });
});

describe("guidelines", () => {
  it("rejects unsupported files without adding them", async () => {
    const out = await core.addGuidelineFiles("o/r", [path.join(dir, "state.exe")]);
    expect(out.errors).toHaveLength(1);
    expect(core.state().docs).toHaveLength(0);
  });
  it("never exposes tokens to the UI", async () => {
    await core.start();
    expect(JSON.stringify(core.state())).not.toContain("token");
  });
});

const merged = (n: number, sha = "m1"): PullRequest => ({ ...pr(n, sha), key: `acct:o/r#${n}`, status: "merged" });

describe("review by link", () => {
  it("adds a merged PR, reviews it next, and keeps it when refreshes don't list it", async () => {
    lookup = [merged(70)];
    await core.start();
    await flush();
    const key = await core.addByLink("https://github.com/o/r/pull/70/files");
    expect(key).toBe("acct:o/r#70");
    await flush();
    expect(core.state().prs.find((p) => p.key === key)).toMatchObject({ addedByLink: true, status: "merged" });
    expect(core.state().reviews[key]).toMatchObject({ state: "ready", manual: true });
    await core.refresh();
    expect(core.state().prs.some((p) => p.key === key)).toBe(true);
  });

  it("explains links it can't use, and adds nothing", async () => {
    await expect(core.addByLink("not a link")).rejects.toThrow(/Paste the full link/);
    await expect(core.addByLink("https://github.com/o/r/issues/3")).rejects.toThrow(/doesn't look like/);
    await expect(core.addByLink("https://git.example.com/o/r/pull/1")).rejects.toThrow(/No account for git.example.com/);
    await expect(core.addByLink("https://github.com/o/r/-/merge_requests/1")).rejects.toThrow(/connected as GitHub, but this is a GitLab link/);
    await expect(core.addByLink("https://bitbucket.org/o/r/pull-requests/1")).rejects.toThrow(/Bitbucket/);
    await expect(core.addByLink("https://github.com/o/r/pull/404")).rejects.toThrow(/Couldn't open o\/r #404/);
    lookupError = new Error("Couldn't reach github.com.");
    await expect(core.addByLink("https://github.com/o/r/pull/5")).rejects.toThrow(/Couldn't reach/);
    expect(core.state().prs.filter((p) => p.addedByLink)).toEqual([]);
  });

  it("opens a PR that's already in the list instead of adding it twice", async () => {
    await core.start();
    await flush();
    lookup = [pr(1)];
    const key = await core.addByLink("github.com/o/r/pull/1");
    expect(key).toBe(pr(1).key);
    expect(core.state().prs.filter((p) => p.key === key)).toHaveLength(1);
    expect(mocks.runReview).toHaveBeenCalledTimes(1);
  });

  it("fetches the latest commit before reviewing a linked PR again", async () => {
    lookup = [{ ...pr(9, "old"), status: "open" }];
    await core.start();
    const key = await core.addByLink("https://github.com/o/r/pull/9");
    await flush();
    lookup = [{ ...pr(9, "new"), status: "merged" }];
    await core.startReview(key);
    await flush();
    expect(core.state().prs.find((p) => p.key === key)).toMatchObject({ headSha: "new", status: "merged", addedByLink: true });
    expect(core.state().reviews[key]?.headSha).toBe("new");
  });

  it("only sends comments to a merged PR", async () => {
    lookup = [merged(70)];
    await core.start();
    const key = await core.addByLink("https://github.com/o/r/pull/70");
    await flush();
    await expect(core.sendReview(key, "approve")).rejects.toThrow(/already merged, so it can only get comments/);
    await expect(core.sendReview(key, "request_changes")).rejects.toThrow(/only get comments/);
    expect(submitted).toEqual([]);
    await core.sendReview(key, "comment");
    expect(submitted).toHaveLength(1);
  });

  it("removes only PRs that were added by link", async () => {
    lookup = [merged(70)];
    await core.start();
    await flush();
    const key = await core.addByLink("https://github.com/o/r/pull/70");
    await flush();
    await expect(core.removeLinked(pr(1).key)).rejects.toThrow(/Only changes added by link/);
    await core.removeLinked(key);
    expect(core.state().prs.some((p) => p.key === key)).toBe(false);
    expect(core.state().reviews[key]).toBeUndefined();
  });

  it("keeps the link flag when a linked PR also becomes assigned, and after it stops", async () => {
    lookup = [pr(3)];
    await core.start();
    const key = await core.addByLink("https://github.com/o/r/pull/3");
    assigned = [pr(1), pr(3)];
    await core.refresh();
    expect(core.state().prs.find((p) => p.key === key)?.addedByLink).toBe(true);
    assigned = [pr(1)];
    await core.refresh();
    expect(core.state().prs.some((p) => p.key === key)).toBe(true);
  });
});

describe("compliance standards", () => {
  it("lists the standards from the shipped catalogue", () => {
    const catalog = core.getComplianceCatalog();
    expect(catalog.filter((s) => s.status === "available").length).toBeGreaterThanOrEqual(2);
    expect(catalog.some((s) => s.id === "nis2" && s.status === "available")).toBe(true);
  });

  it("refuses standards that don't exist", () => {
    expect(() => core.setCompliance("o/r", [{ id: "made-up", level: "must" }])).toThrow(/isn't available/);
    expect(core.state().compliance).toEqual({});
  });

  it("checks the project's standards plus all-project ones, with the project's level winning", async () => {
    core.setCompliance(ALL_PROJECTS, [{ id: "pci-dss", level: "recommended" }, { id: "csp", level: "must" }]);
    core.setCompliance("o/r", [{ id: "pci-dss", level: "must" }, { id: "pci-dss", level: "recommended" }]);
    expect(core.state().compliance["o/r"]).toEqual([{ id: "pci-dss", level: "must" }]);
    await core.start();
    await flush();
    const sent = mocks.bundleInputs[0]?.compliance as { standard: { id: string }; level: string; checklistPath: string }[];
    expect(sent.map((s) => [s.standard.id, s.level])).toEqual([["pci-dss", "must"], ["csp", "must"]]);
    expect(sent[0]!.checklistPath).toMatch(/compliance[\\/]pci-dss\.md$/);
  });

  it("removes made-up control IDs and reports every selected standard", async () => {
    core.setCompliance("o/r", [{ id: "pci-dss", level: "must" }, { id: "csp", level: "must" }]);
    mocks.runReview.mockResolvedValue({
      ...result,
      findings: [
        { ...result.findings[0], controls: ["pci dss 3.5.1", "PCI DSS 99.9", "GDPR Art. 32"] },
        { ...result.findings[0], title: "second", controls: ["Made up 1"] },
      ],
      compliance: [{ standard: "pci-dss", status: "pass", note: "Looked fine." }, { standard: "gdpr", status: "issues", note: "Not selected." }],
    });
    await core.start();
    await flush();
    const r = core.state().reviews[pr(1).key]!.result!;
    expect(r.findings[0]!.controls).toEqual(["PCI DSS 3.5.1"]);
    expect(r.findings[1]).not.toHaveProperty("controls");
    expect(r.compliance).toEqual([
      { standard: "pci-dss", status: "issues", note: "Issues were found. See the issues that list its controls." },
      { standard: "csp", status: "needs_check", note: "The reviewer didn't report on this standard, so check it yourself." },
    ]);
  });

  it("strips controls when no standards are selected", async () => {
    mocks.runReview.mockResolvedValue({ ...result, findings: [{ ...result.findings[0], controls: ["PCI DSS 3.5.1"] }] });
    await core.start();
    await flush();
    const r = core.state().reviews[pr(1).key]!.result!;
    expect(r.findings[0]).not.toHaveProperty("controls");
    expect(r.compliance).toEqual([]);
    expect(mocks.bundleInputs[0]?.compliance).toEqual([]);
  });
});
