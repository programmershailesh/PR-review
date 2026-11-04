import type { Account, PullRequest, RepoInfo, SendEvent } from "../../shared/types";

export interface PrDetails {
  mergeBaseSha: string;
  linkedIssues: { reference: string; title: string; body: string }[];
  comments: { author: string; body: string }[];
}

export interface InlineComment {
  path: string;
  line: number;
  body: string;
  /** The path before a rename. GitLab needs it to place a comment. */
  oldPath?: string;
  /** The line's number before this change, when it's an unchanged line. GitLab needs it to place a comment. */
  oldLine?: number;
}

export interface ReviewSubmission {
  event: SendEvent;
  body: string;
  comments: InlineComment[];
}

/** One implementation per Git service. Add Bitbucket behind this interface. */
export interface GitProvider {
  /** Confirms the token works and returns the username it belongs to. */
  verify(): Promise<string>;
  /** Open PRs where the user is a requested reviewer or an assignee. */
  listAssigned(username: string, accountId: string): Promise<PullRequest[]>;
  /** Every repository this account can access. */
  listRepositories(accountId: string): Promise<RepoInfo[]>;
  getDetails(pr: PullRequest): Promise<PrDetails>;
  submitReview(pr: PullRequest, review: ReviewSubmission): Promise<void>;
  /** The git URL and auth header used to fetch this repository. */
  gitRemote(pr: PullRequest): { url: string; authHeader: string };
}

export type ProviderFactory = (account: Pick<Account, "provider" | "host">, token: string) => GitProvider;

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}
