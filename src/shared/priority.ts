import type { PullRequest, ReviewRecord } from "./types";

export type ProjectPrefs = Record<string, { enabled: boolean }>;

/** A project the user hasn't decided on follows their setting for new projects. */
export function projectEnabled(repo: string, prefs: ProjectPrefs, reviewNewProjects: boolean): boolean {
  return prefs[repo]?.enabled ?? reviewNewProjects;
}

/** Ranked projects first, in the user's order, then the rest alphabetically. */
export function sortProjects(repos: string[], order: string[]): string[] {
  const rank = new Map(order.map((r, i) => [r, i]));
  return [...repos].sort((a, b) => {
    const ra = rank.get(a) ?? Infinity;
    const rb = rank.get(b) ?? Infinity;
    return ra === rb ? a.localeCompare(b) : ra - rb;
  });
}

/**
 * The order queued reviews will run in. A review the user asked for by hand comes first,
 * then project priority, and within a project the PR that has waited longest.
 */
export function queueOrder(prs: PullRequest[], reviews: Record<string, ReviewRecord>, order: string[]): PullRequest[] {
  const rank = new Map(order.map((r, i) => [r, i]));
  const rankOf = (repo: string) => rank.get(repo) ?? Infinity;
  return prs
    .filter((p) => reviews[p.key]?.state === "queued")
    .sort((a, b) => {
      const ma = reviews[a.key]?.manual ? 0 : 1;
      const mb = reviews[b.key]?.manual ? 0 : 1;
      if (ma !== mb) return ma - mb;
      const ra = rankOf(a.repo);
      const rb = rankOf(b.repo);
      if (ra !== rb) return ra - rb;
      if (a.repo !== b.repo) return a.repo.localeCompare(b.repo);
      return a.updatedAt.localeCompare(b.updatedAt);
    });
}
