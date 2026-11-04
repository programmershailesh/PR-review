import { describe, expect, it } from "vitest";
import { projectEnabled, queueOrder, sortProjects } from "./priority";
import type { PullRequest, ReviewRecord } from "./types";

const pr = (repo: string, n: number, updatedAt = "2026-01-01"): PullRequest =>
  ({ key: `${repo}#${n}`, repo, number: n, updatedAt }) as PullRequest;
const queued = (prs: PullRequest[], manual: string[] = []): Record<string, ReviewRecord> =>
  Object.fromEntries(prs.map((p) => [p.key, { state: "queued", manual: manual.includes(p.key) } as ReviewRecord]));

describe("projectEnabled", () => {
  it("uses the user's choice first, then the setting for new projects", () => {
    expect(projectEnabled("a", { a: { enabled: false } }, true)).toBe(false);
    expect(projectEnabled("a", { a: { enabled: true } }, false)).toBe(true);
    expect(projectEnabled("b", {}, true)).toBe(true);
    expect(projectEnabled("b", {}, false)).toBe(false);
  });
});

describe("sortProjects", () => {
  it("puts ranked projects first, then the rest alphabetically", () => {
    expect(sortProjects(["z", "b", "a", "c"], ["c", "z"])).toEqual(["c", "z", "a", "b"]);
  });
});

describe("queueOrder", () => {
  it("follows project priority, whatever order the PRs arrived in", () => {
    const prs = [pr("low", 1), pr("high", 2), pr("mid", 3)];
    expect(queueOrder(prs, queued(prs), ["high", "mid", "low"]).map((p) => p.repo)).toEqual(["high", "mid", "low"]);
  });
  it("takes the longest-waiting PR first within a project", () => {
    const prs = [pr("a", 1, "2026-03-01"), pr("a", 2, "2026-01-01")];
    expect(queueOrder(prs, queued(prs), ["a"]).map((p) => p.number)).toEqual([2, 1]);
  });
  it("runs a review the user asked for ahead of everything", () => {
    const prs = [pr("high", 1), pr("low", 2)];
    expect(queueOrder(prs, queued(prs, ["low#2"]), ["high", "low"]).map((p) => p.repo)).toEqual(["low", "high"]);
  });
  it("puts unranked projects after ranked ones", () => {
    const prs = [pr("new", 1), pr("ranked", 2)];
    expect(queueOrder(prs, queued(prs), ["ranked"]).map((p) => p.repo)).toEqual(["ranked", "new"]);
  });
  it("ignores reviews that aren't queued", () => {
    const prs = [pr("a", 1), pr("a", 2)];
    const reviews = { "a#1": { state: "ready" } as ReviewRecord, "a#2": { state: "queued" } as ReviewRecord };
    expect(queueOrder(prs, reviews, []).map((p) => p.number)).toEqual([2]);
  });
});
