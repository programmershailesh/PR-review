import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PullRequest, ReviewResult } from "../shared/types";
import { AppCore } from "./app-core";
import type { GitProvider, ReviewSubmission } from "./providers/types";
import { Store } from "./store";

const mocks = vi.hoisted(() => ({
  claudeOk: true,
  runReview: vi.fn(),
}));
vi.mock("./claude/auth", () => ({
  checkClaude: async () => (mocks.claudeOk ? { ok: true, found: true, subscriptionType: "max" } : { ok: false, found: true, message: "Not signed in." }),
}));
vi.mock("./claude/find", () => ({ findClaude: () => ({ command: "claude", prefixArgs: [] }) }));
vi.mock("./claude/runner", () => ({ runReview: mocks.runReview }));
vi.mock("./review/bundle", () => ({
  prepareBundle: async () => ({ dir: "bundle", diff: "diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-a\n+b\n" }),
  removeBundle: async () => undefined,
}));

const result = { verdict: "approve", summary: "Fine.", findings: [{ file: "a.ts", line: 1, title: "t", problem: "p", impact: "i", betterApproach: "b", severity: "minor" }] } as unknown as ReviewResult;
const pr = (n: number, sha = "sha1"): PullRequest => ({
  key: `acct:o/r#${n}`, accountId: "acct", provider: "github", repo: "o/r", number: n, title: `PR ${n}`, author: "a", url: "", description: "",
  baseRef: "main", headRef: "f", baseSha: "b", headSha: sha, additions: 0, deletions: 0, updatedAt: "",
});
const flush = () => new Promise((r) => setTimeout(r, 15));

let dir: string;
let assigned: PullRequest[];
let listError: Error | undefined;
let submitError: Error | undefined;
let submitted: ReviewSubmission[];
let core: AppCore;
let store: Store;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "code-reviewer-core-"));
  assigned = [pr(1)];
  listError = undefined;
  submitError = undefined;
  submitted = [];
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
    enginePath: "engine",
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
