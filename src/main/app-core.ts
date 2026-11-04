import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { projectEnabled, queueOrder } from "../shared/priority";
import { ALL_PROJECTS, type AddFilesOutcome, type AppState, type ClaudeStatus, type DocLevel, type FindingDraft, type GuidelineDoc, type GuidelineScope, type ProviderId, type PullRequest, type ReviewRecord, type SendEvent, type Settings } from "../shared/types";
import { checkClaude } from "./claude/auth";
import { findClaude } from "./claude/find";
import { runReview } from "./claude/runner";
import { convertDocument, fileSize, validateDocument } from "./guidelines/convert";
import { GitHubProvider } from "./providers/github";
import { GitLabProvider } from "./providers/gitlab";
import { type GitProvider } from "./providers/types";
import { prepareBundle, removeBundle } from "./review/bundle";
import { composeReview } from "./review/compose";
import { verifyRuleSources } from "./review/sources";
import type { Store } from "./store";

const POLL_MS = 2 * 60 * 1000;
const SENT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const REPOSITORIES_MAX_AGE_MS = 60 * 60 * 1000;

export interface CoreDeps {
  store: Store;
  userData: string;
  enginePath: string;
  encrypt(token: string): string;
  decrypt(blob: string): string;
  notify(title: string, body: string): void;
  emit(state: AppState): void;
  /** Called when the last review finishes and nothing else can run. */
  onIdle?(): void;
  /** Replaces the real providers in tests. */
  providerFactory?(provider: ProviderId, host: string, token: string): GitProvider;
}

/** All app behaviour lives here, with Electron kept behind CoreDeps. */
export class AppCore {
  private claude: ClaudeStatus = { ok: false, found: false, message: "Checking Claude Code…" };
  private refreshing = false;
  private running?: { prKey: string; abort: AbortController };
  private pollTimer?: NodeJS.Timeout;
  private background = false;
  private stopping = false;

  constructor(private readonly deps: CoreDeps) {}

  private get data() {
    return this.deps.store.data;
  }

  state(): AppState {
    const { accounts, prs, reviews, docs, rules, settings, projects, projectOrder, repositories, lastRefreshAt } = this.data;
    return { claude: this.claude, accounts, prs, reviews, docs, rules, settings, projects, projectOrder, repositories, refreshing: this.refreshing, lastRefreshAt };
  }

  private isEnabled(repo: string): boolean {
    return projectEnabled(repo, this.data.projects, this.data.settings.reviewNewProjects);
  }

  private changed(): void {
    this.deps.store.save();
    this.deps.emit(this.state());
  }

  /** True while reviews are running, or waiting and able to run. */
  hasWork(): boolean {
    if (this.running) return true;
    return this.claude.ok && Object.values(this.data.reviews).some((r) => r.state === "queued");
  }

  /** While the window is closed, finish what's started, but don't look for new work. */
  setBackground(on: boolean): void {
    this.background = on;
  }

  async start(): Promise<void> {
    this.deps.store.recoverInterrupted();
    // Left behind if the app was quit during a review.
    await rm(path.join(this.deps.userData, "bundles"), { recursive: true, force: true, maxRetries: 3 }).catch(() => undefined);
    await this.checkClaude();
    void this.refresh();
    this.pollTimer = setInterval(() => void this.refresh(), POLL_MS);
    this.pump();
  }

  stop(): void {
    // A review stopped by quitting stays "running" on disk, so it restarts next launch.
    this.stopping = true;
    clearInterval(this.pollTimer);
    this.running?.abort.abort();
    this.deps.store.flush();
  }

  async checkClaude(): Promise<void> {
    this.claude = await checkClaude();
    this.changed();
    this.pump();
  }

  /* Accounts */

  private provider(accountId: string): GitProvider {
    const account = this.data.accounts.find((a) => a.id === accountId);
    const blob = this.data.tokens[accountId];
    if (!account || !blob) throw new Error("This account is no longer connected.");
    return this.makeProvider(account.provider, account.host, this.deps.decrypt(blob));
  }

  private makeProvider(provider: ProviderId, host: string, token: string): GitProvider {
    if (this.deps.providerFactory) return this.deps.providerFactory(provider, host, token);
    if (provider === "github") return new GitHubProvider(host, token);
    if (provider === "gitlab") return new GitLabProvider(host, token);
    throw new Error("Only GitHub and GitLab are available so far. Bitbucket is coming next.");
  }

  async connectAccount(input: { provider: ProviderId; host: string; token: string }): Promise<void> {
    const host = input.host.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
    if (!/^[a-z0-9.-]+(:\d+)?$/.test(host)) throw new Error("Enter a server address such as gitlab.com.");
    const token = input.token.trim();
    if (!token) throw new Error("Enter your access token.");
    const username = await this.makeProvider(input.provider, host, token).verify();
    const existing = this.data.accounts.find((a) => a.provider === input.provider && a.host === host && a.username === username);
    const id = existing?.id ?? randomUUID();
    if (!existing) this.data.accounts.push({ id, provider: input.provider, host, username });
    this.data.tokens[id] = this.deps.encrypt(token);
    this.deps.store.flush();
    this.changed();
    await this.refresh();
  }

  async disconnectAccount(id: string): Promise<void> {
    this.data.accounts = this.data.accounts.filter((a) => a.id !== id);
    delete this.data.tokens[id];
    for (const pr of this.data.prs.filter((p) => p.accountId === id)) {
      if (this.running?.prKey === pr.key) this.running.abort.abort();
      delete this.data.reviews[pr.key];
      await rm(this.diffPath(pr.key), { force: true });
    }
    this.data.prs = this.data.prs.filter((p) => p.accountId !== id);
    this.data.repositories = this.data.repositories.filter((r) => r.accountId !== id);
    delete this.data.repositoriesAt[id];
    this.deps.store.flush();
    this.changed();
  }

  /* Refreshing the list */

  async refresh(): Promise<void> {
    if (this.refreshing || this.background) return;
    this.refreshing = true;
    this.deps.emit(this.state());
    try {
      await Promise.all(this.data.accounts.map((a) => this.refreshAccount(a.id)));
      this.data.lastRefreshAt = new Date().toISOString();
    } finally {
      this.refreshing = false;
      this.changed();
    }
    this.pump();
  }

  private async refreshAccount(id: string): Promise<void> {
    const account = this.data.accounts.find((a) => a.id === id);
    if (!account) return;
    let latest: PullRequest[];
    try {
      latest = await this.provider(id).listAssigned(account.username, id);
      delete account.error;
    } catch (err) {
      // Keep the existing list when a refresh fails. A network blip must not discard reviews.
      account.error = err instanceof Error ? err.message : String(err);
      return;
    }
    const latestKeys = new Set(latest.map((p) => p.key));
    const now = Date.now();
    const kept: PullRequest[] = [];
    for (const pr of this.data.prs) {
      if (pr.accountId !== id) {
        kept.push(pr);
        continue;
      }
      if (latestKeys.has(pr.key)) continue;
      const review = this.data.reviews[pr.key];
      // Sending a review removes the request on GitHub, so a sent review stays visible for a while.
      const keepSent = review?.state === "sent" && review.sentAt && now - Date.parse(review.sentAt) < SENT_RETENTION_MS;
      if (keepSent) {
        kept.push(pr);
      } else {
        if (this.running?.prKey === pr.key) this.running.abort.abort();
        delete this.data.reviews[pr.key];
        void rm(this.diffPath(pr.key), { force: true });
      }
    }
    this.data.prs = [...kept, ...latest];
    this.reconcileQueue();
    await this.loadRepositories(id).catch(() => undefined);
  }

  /** Brings the queue in line with the current PRs, project choices and settings. */
  private reconcileQueue(): void {
    for (const pr of this.data.prs) {
      const review = this.data.reviews[pr.key];
      if (!this.isEnabled(pr.repo)) {
        // Stop automatic work for a turned-off project. Reviews asked for by hand stay.
        const pending = review?.state === "queued" || review?.state === "running";
        if (pending && !review?.manual) {
          if (this.running?.prKey === pr.key) this.running.abort.abort();
          delete this.data.reviews[pr.key];
        }
        continue;
      }
      if (this.data.settings.autoStart && (!review || review.headSha !== pr.headSha)) {
        // New commits make a run in progress pointless, so stop it rather than spend the usage.
        if (this.running?.prKey === pr.key) this.running.abort.abort();
        this.enqueue(pr);
      }
    }
  }

  private async loadRepositories(accountId: string, force = false): Promise<void> {
    const last = this.data.repositoriesAt[accountId] ?? 0;
    if (!force && Date.now() - last < REPOSITORIES_MAX_AGE_MS) return;
    const repos = await this.provider(accountId).listRepositories(accountId);
    this.data.repositories = [...this.data.repositories.filter((r) => r.accountId !== accountId), ...repos];
    this.data.repositoriesAt[accountId] = Date.now();
  }

  async refreshRepositories(): Promise<void> {
    await Promise.all(this.data.accounts.map((a) => this.loadRepositories(a.id, true)));
    this.changed();
  }

  /* Project choices and priority */

  setProjectEnabled(repo: string, enabled: boolean): void {
    this.data.projects[repo] = { enabled };
    this.data.projectOrder = this.data.projectOrder.filter((r) => r !== repo);
    if (enabled) this.data.projectOrder.push(repo);
    this.reconcileQueue();
    this.changed();
    this.pump();
  }

  setProjectOrder(repos: string[]): void {
    this.data.projectOrder = [...new Set(repos)];
    this.changed();
    this.pump();
  }

  /* Review queue. One at a time, because subscription limits are shared with the user's other work. */

  private enqueue(pr: PullRequest, manual = false): void {
    this.data.reviews[pr.key] = { prKey: pr.key, headSha: pr.headSha, state: "queued", drafts: {}, ...(manual ? { manual } : {}) };
  }

  async startReview(prKey: string): Promise<void> {
    const pr = this.findPr(prKey);
    if (this.running?.prKey === prKey) return;
    this.enqueue(pr, true);
    this.changed();
    this.pump();
  }

  async cancelReview(prKey: string): Promise<void> {
    const review = this.data.reviews[prKey];
    if (this.running?.prKey === prKey) this.running.abort.abort();
    else if (review?.state === "queued") {
      review.state = "failed";
      review.error = "Cancelled.";
      this.changed();
    }
  }

  private pump(): void {
    if (this.running || !this.claude.ok) return;
    const next = queueOrder(this.data.prs, this.data.reviews, this.data.projectOrder)[0];
    if (next) void this.execute(next);
  }

  private docsFor(repo: string): { doc: GuidelineDoc; textPath: string }[] {
    return this.data.docs
      .filter((d) => d.on && d.status === "ready" && (d.scope === repo || d.scope === ALL_PROJECTS))
      // Project documents come first, because they take precedence.
      .sort((a, b) => Number(a.scope === ALL_PROJECTS) - Number(b.scope === ALL_PROJECTS))
      .map((doc) => ({ doc, textPath: this.docTextPath(doc.id) }));
  }

  private async execute(pr: PullRequest): Promise<void> {
    const review = this.data.reviews[pr.key] as ReviewRecord;
    const abort = new AbortController();
    this.running = { prKey: pr.key, abort };
    review.state = "running";
    review.headSha = pr.headSha;
    delete review.error;
    review.progress = { stage: "preparing", specialistsStarted: 0, specialistsDone: 0 };
    this.changed();

    let bundleDir: string | undefined;
    try {
      // Checked before every run, in case the login changed since the last one.
      this.claude = await checkClaude();
      if (!this.claude.ok) throw new Error(this.claude.message ?? "Claude Code isn't ready.");
      const claude = findClaude();
      if (!claude) throw new Error("Claude Code couldn't be found.");
      const provider = this.provider(pr.accountId);
      const details = await provider.getDetails(pr);
      if (abort.signal.aborted) throw new Error("cancelled");
      const docs = this.docsFor(pr.repo);
      const rules = [...(this.data.rules[pr.repo] ?? []), ...(this.data.rules[ALL_PROJECTS] ?? [])];
      const bundle = await prepareBundle({
        pr,
        details,
        remote: provider.gitRemote(pr),
        docs,
        rules,
        cacheRoot: path.join(this.deps.userData, "repos"),
        bundleRoot: path.join(this.deps.userData, "bundles"),
      });
      bundleDir = bundle.dir;
      await this.saveDiff(pr.key, bundle.diff);
      review.progress = { stage: "reading", specialistsStarted: 0, specialistsDone: 0 };
      this.changed();
      const result = await runReview({
        claude,
        bundleDir: bundle.dir,
        enginePath: this.deps.enginePath,
        depth: this.data.settings.depth,
        signal: abort.signal,
        onProgress: (progress) => {
          review.progress = progress;
          this.changed();
        },
      });
      // The record may have been replaced if the PR was updated or disconnected during the run.
      if (this.data.reviews[pr.key] !== review) return;
      review.result = verifyRuleSources(result, {
        bundleDir: bundle.dir,
        docTitles: docs.map((d) => d.doc.name),
        hasQuickRules: rules.length > 0,
        description: `${pr.title}\n${pr.description}`,
        linkedIssues: details.linkedIssues.filter((i) => i.title).map((i) => i.reference),
      });
      review.drafts = {};
      review.state = "ready";
      review.finishedAt = new Date().toISOString();
      delete review.progress;
      if (this.data.settings.notify) {
        this.deps.notify("Review ready", pr.title);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (this.stopping) return;
      if (this.data.reviews[pr.key] === review) {
        review.state = "failed";
        review.error = message === "cancelled" || abort.signal.aborted ? "Cancelled." : message;
        delete review.progress;
      }
    } finally {
      if (bundleDir) await removeBundle(bundleDir).catch(() => undefined);
      this.running = undefined;
      if (!this.stopping) {
        this.changed();
        this.pump();
        if (!this.hasWork()) this.deps.onIdle?.();
      }
    }
  }

  private findPr(prKey: string): PullRequest {
    const pr = this.data.prs.find((p) => p.key === prKey);
    if (!pr) throw new Error("This review is no longer available.");
    return pr;
  }

  /* Review results */

  private diffPath(prKey: string): string {
    const safe = Buffer.from(prKey).toString("base64url");
    return path.join(this.deps.userData, "diffs", `${safe}.patch`);
  }

  private async saveDiff(prKey: string, diff: string): Promise<void> {
    await mkdir(path.dirname(this.diffPath(prKey)), { recursive: true });
    await writeFile(this.diffPath(prKey), diff);
  }

  async getDiff(prKey: string): Promise<string> {
    return readFile(this.diffPath(prKey), "utf8").catch(() => "");
  }

  updateDraft(prKey: string, index: number, draft: FindingDraft): void {
    const review = this.data.reviews[prKey];
    if (!review?.result?.findings[index]) throw new Error("This issue no longer exists.");
    review.drafts[index] = draft;
    this.changed();
  }

  /** Called only from an explicit Send press in the UI. Nothing else posts to a provider. */
  async sendReview(prKey: string, event: SendEvent): Promise<void> {
    const pr = this.findPr(prKey);
    const review = this.data.reviews[prKey];
    if (review?.state !== "ready" || !review.result) throw new Error("This review isn't ready to send.");
    const submission = composeReview(review.result, review.drafts, await this.getDiff(prKey), event);
    await this.provider(pr.accountId).submitReview({ ...pr, headSha: review.headSha }, submission);
    review.state = "sent";
    review.sentAs = event;
    review.sentAt = new Date().toISOString();
    this.deps.store.flush();
    this.changed();
  }

  /* Guidelines */

  private docTextPath(id: string): string {
    return path.join(this.deps.userData, "guidelines", `${id}.md`);
  }

  async addGuidelineFiles(scope: GuidelineScope, paths: string[]): Promise<AddFilesOutcome> {
    const errors: string[] = [];
    for (const file of paths) {
      const name = path.basename(file);
      let size = 0;
      try {
        size = await fileSize(file);
      } catch {
        errors.push(`"${name}" couldn't be opened.`);
        continue;
      }
      const invalid = validateDocument(name, size);
      if (invalid) {
        errors.push(invalid);
        continue;
      }
      if (this.data.docs.some((d) => d.scope === scope && d.name === name)) {
        errors.push(`"${name}" has already been added.`);
        continue;
      }
      const doc: GuidelineDoc = { id: randomUUID(), scope, name, size, level: "must", on: true, status: "reading", addedAt: new Date().toISOString() };
      this.data.docs.push(doc);
      this.changed();
      void this.convertDoc(doc, file);
    }
    return { errors };
  }

  private async convertDoc(doc: GuidelineDoc, file: string): Promise<void> {
    try {
      const text = await convertDocument(file);
      await mkdir(path.dirname(this.docTextPath(doc.id)), { recursive: true });
      await writeFile(this.docTextPath(doc.id), text);
      doc.status = "ready";
    } catch (err) {
      doc.status = "failed";
      doc.error = err instanceof Error ? err.message : "This file couldn't be read.";
    }
    this.changed();
  }

  updateDoc(id: string, patch: { level?: DocLevel; on?: boolean }): void {
    const doc = this.data.docs.find((d) => d.id === id);
    if (!doc) return;
    if (patch.level) doc.level = patch.level;
    if (patch.on !== undefined) doc.on = patch.on;
    this.changed();
  }

  async removeDoc(id: string): Promise<void> {
    this.data.docs = this.data.docs.filter((d) => d.id !== id);
    await rm(this.docTextPath(id), { force: true });
    this.changed();
  }

  addRule(scope: GuidelineScope, text: string): void {
    const t = text.trim();
    if (!t) return;
    (this.data.rules[scope] ??= []).push(t);
    this.changed();
  }

  removeRule(scope: GuidelineScope, index: number): void {
    this.data.rules[scope]?.splice(index, 1);
    this.changed();
  }

  updateSettings(patch: Partial<Settings>): void {
    Object.assign(this.data.settings, patch);
    if (patch.reviewNewProjects !== undefined) this.reconcileQueue();
    this.changed();
    this.pump();
  }
}
