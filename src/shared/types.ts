export type ProviderId = "github" | "gitlab" | "bitbucket";

export const PROVIDER_NAME: Record<ProviderId, string> = { github: "GitHub", gitlab: "GitLab", bitbucket: "Bitbucket" };

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
  /** Absent on PRs saved before 1.4.0, which were all open. */
  status?: PrStatus;
  /** Added by pasting its link, rather than found by assignment. Kept until the user removes it. */
  addedByLink?: boolean;
}

export type PrStatus = "open" | "merged" | "closed";

export type Severity = "blocker" | "major" | "minor" | "nit";
export type Dimension = "architecture" | "performance" | "security" | "correctness" | "stack" | "requirements";
/** A finding's area. Compliance findings have no matching entry in ReviewResult.dimensions. */
export type FindingDimension = Dimension | "compliance";
export type Verdict = "approve" | "approve_with_comments" | "needs_discussion" | "request_changes";
export type DimensionStatus = "pass" | "watch" | "block" | "not_applicable";
export type RequirementStatus = "met" | "partial" | "missing" | "unclear";

export interface Finding {
  severity: Severity;
  dimension: FindingDimension;
  file: string;
  line: number;
  endLine?: number;
  title: string;
  problem: string;
  impact: string;
  betterApproach: string;
  suggestedCode?: string;
  ruleSource?: string;
  /** Compliance control IDs from the selected checklists, such as "PCI DSS 3.5.1". */
  controls?: string[];
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
  /** One entry per selected standard. Absent on reviews saved before 1.4.0. */
  compliance?: ComplianceResult[];
}

export type ComplianceStatus = "issues" | "pass" | "needs_check" | "not_applicable";

export interface ComplianceResult {
  /** The standard's catalogue id, such as "pci-dss". */
  standard: string;
  status: ComplianceStatus;
  note: string;
}

/** A standard the reviewer can check code against, from review-engine/compliance/catalog.json. */
export interface ComplianceStandard {
  id: string;
  name: string;
  /** Present when the standard is available to select. */
  shortName?: string;
  category: string;
  region: string;
  version?: string;
  sourceUrl?: string;
  lastReviewed?: string;
  summary?: string;
  /** "planned" standards are listed so people can see what's coming, but can't be selected yet. */
  status: "available" | "planned";
}

export interface ComplianceChoice {
  id: string;
  level: DocLevel;
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
  /** Standards chosen per project, or for ALL_PROJECTS. */
  compliance: Record<GuidelineScope, ComplianceChoice[]>;
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
  getComplianceCatalog(): Promise<ComplianceStandard[]>;
  setCompliance(scope: GuidelineScope, choices: ComplianceChoice[]): Promise<void>;
  /** Returns the key of the PR, whether it was new or already in the list. */
  addByLink(url: string): Promise<string>;
  removeLinked(prKey: string): Promise<void>;
}
