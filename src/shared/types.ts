export type ProviderId = "github" | "gitlab" | "bitbucket";

export interface Account {
  id: string;
  provider: ProviderId;
  host: string;
  username: string;
  /** Set when the last refresh failed, so the UI can say why the list is stale. */
  error?: string;
}

export interface PullRequest {
  key: string;
  accountId: string;
  provider: ProviderId;
  repo: string;
  number: number;
  title: string;
  author: string;
  url: string;
  description: string;
  baseRef: string;
  headRef: string;
  baseSha: string;
  headSha: string;
  additions: number;
  deletions: number;
  updatedAt: string;
}

export type Severity = "blocker" | "major" | "minor" | "nit";
export type Dimension = "architecture" | "performance" | "security" | "correctness" | "stack" | "requirements";
export type Verdict = "approve" | "approve_with_comments" | "needs_discussion" | "request_changes";
export type DimensionStatus = "pass" | "watch" | "block" | "not_applicable";
export type RequirementStatus = "met" | "partial" | "missing" | "unclear";

export interface Finding {
  severity: Severity;
  dimension: Dimension;
  file: string;
  line: number;
  endLine?: number;
  title: string;
  problem: string;
  impact: string;
  betterApproach: string;
  suggestedCode?: string;
  ruleSource?: string;
  confidence: "high" | "medium";
  challenge: { outcome: "survived" | "downgraded"; originalSeverity?: Severity; note: string };
}

export interface ReviewResult {
  verdict: Verdict;
  summary: string;
  stack: { name: string; version?: string; paths: string[] }[];
  dimensions: Record<Dimension, { status: DimensionStatus; note: string }>;
  requirements: { requirement: string; source: string; status: RequirementStatus; evidence: string }[];
  findings: Finding[];
  rejected: { title: string; raisedBy?: string; reason: string }[];
  challengeStats: { raised: number; rejected: number; downgraded: number; kept: number };
  coverage: { filesReviewed: number; filesSkipped: { path: string; reason: string }[] };
  praise: string[];
  /** The project rules this review was judged against. Absent on older saved reviews. */
  guidelinesUsed?: string[];
}

export type ReviewState = "queued" | "running" | "ready" | "sent" | "failed";
export type RunStage = "preparing" | "reading" | "checking" | "challenging" | "writing";

export interface RunProgress {
  stage: RunStage;
  specialistsStarted: number;
  specialistsDone: number;
}

export interface FindingDraft {
  included: boolean;
  text?: string;
}

export interface ReviewRecord {
  prKey: string;
  headSha: string;
  state: ReviewState;
  progress?: RunProgress;
  result?: ReviewResult;
  error?: string;
  /** Keyed by the finding's index in result.findings. */
  drafts: Record<number, FindingDraft>;
  /** The user asked for this review by hand, so it runs ahead of the priority order. */
  manual?: boolean;
  sentAs?: SendEvent;
  sentAt?: string;
  finishedAt?: string;
}

export type SendEvent = "request_changes" | "comment" | "approve";

export type DocLevel = "must" | "recommended";
/** A repository name such as "owner/repo", or ALL_PROJECTS. */
export type GuidelineScope = string;
export const ALL_PROJECTS = "*";

export interface GuidelineDoc {
  id: string;
  scope: GuidelineScope;
  name: string;
  size: number;
  level: DocLevel;
  on: boolean;
  status: "reading" | "ready" | "failed";
  error?: string;
  addedAt: string;
}

export interface ClaudeStatus {
  ok: boolean;
  found: boolean;
  version?: string;
  subscriptionType?: string;
  /** Plain-language explanation when ok is false. */
  message?: string;
}

export type ThemeSetting = "system" | "light" | "dark";

export interface Settings {
  autoStart: boolean;
  notify: boolean;
  depth: "quick" | "thorough";
  theme: ThemeSetting;
  /** Whether a project the user hasn't decided on gets reviewed. */
  reviewNewProjects: boolean;
}

/** A repository the connected account can access, whether or not anything is assigned from it. */
export interface RepoInfo {
  accountId: string;
  name: string;
  isPrivate: boolean;
}

/** Everything the UI renders. Tokens never appear in this object. */
export interface AppState {
  claude: ClaudeStatus;
  accounts: Account[];
  prs: PullRequest[];
  reviews: Record<string, ReviewRecord>;
  docs: GuidelineDoc[];
  rules: Record<GuidelineScope, string[]>;
  settings: Settings;
  projects: Record<string, { enabled: boolean }>;
  /** Project names, highest priority first. */
  projectOrder: string[];
  repositories: RepoInfo[];
  refreshing: boolean;
  lastRefreshAt?: string;
}

export interface AddFilesOutcome {
  errors: string[];
}

/** The API the preload script exposes to the UI as window.codeReviewer. */
export interface CodeReviewerApi {
  getState(): Promise<AppState>;
  onState(listener: (state: AppState) => void): () => void;
  checkClaude(): Promise<void>;
  connectAccount(input: { provider: ProviderId; host: string; token: string }): Promise<void>;
  disconnectAccount(id: string): Promise<void>;
  refresh(): Promise<void>;
  startReview(prKey: string): Promise<void>;
  cancelReview(prKey: string): Promise<void>;
  getDiff(prKey: string): Promise<string>;
  updateDraft(prKey: string, index: number, draft: FindingDraft): Promise<void>;
  sendReview(prKey: string, event: SendEvent): Promise<void>;
  pickGuidelineFiles(scope: GuidelineScope): Promise<AddFilesOutcome>;
  addGuidelineFiles(scope: GuidelineScope, paths: string[]): Promise<AddFilesOutcome>;
  pathForFile(file: File): string;
  updateDoc(id: string, patch: { level?: DocLevel; on?: boolean }): Promise<void>;
  removeDoc(id: string): Promise<void>;
  addRule(scope: GuidelineScope, text: string): Promise<void>;
  removeRule(scope: GuidelineScope, index: number): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  setProjectEnabled(repo: string, enabled: boolean): Promise<void>;
  setProjectOrder(repos: string[]): Promise<void>;
  refreshRepositories(): Promise<void>;
  openExternal(url: string): Promise<void>;
}
