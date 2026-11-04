import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Account, GuidelineDoc, GuidelineScope, PullRequest, RepoInfo, ReviewRecord, Settings } from "../shared/types";

/** What is saved between runs. Tokens are stored encrypted, and never reach the UI. */
export interface PersistedData {
  accounts: Account[];
  /** Encrypted with the OS keychain, keyed by account id. */
  tokens: Record<string, string>;
  prs: PullRequest[];
  reviews: Record<string, ReviewRecord>;
  docs: GuidelineDoc[];
  rules: Record<GuidelineScope, string[]>;
  settings: Settings;
  projects: Record<string, { enabled: boolean }>;
  projectOrder: string[];
  repositories: RepoInfo[];
  /** When each account's repository list was last fetched. */
  repositoriesAt: Record<string, number>;
  lastRefreshAt?: string;
}

export const DEFAULT_SETTINGS: Settings = { autoStart: true, notify: true, depth: "thorough", theme: "system", reviewNewProjects: true };

function empty(): PersistedData {
  return {
    accounts: [],
    tokens: {},
    prs: [],
    reviews: {},
    docs: [],
    rules: {},
    settings: { ...DEFAULT_SETTINGS },
    projects: {},
    projectOrder: [],
    repositories: [],
    repositoriesAt: {},
  };
}

/** A small JSON store. Writes go through a temp file, so a crash can't leave a half-written file. */
export class Store {
  data: PersistedData;
  private timer?: NodeJS.Timeout;

  constructor(private readonly file: string) {
    this.data = Store.load(file);
  }

  private static load(file: string): PersistedData {
    try {
      const saved = JSON.parse(readFileSync(file, "utf8")) as Partial<PersistedData>;
      const base = empty();
      return { ...base, ...saved, settings: { ...base.settings, ...saved.settings } };
    } catch {
      return empty();
    }
  }

  /** Reviews that were interrupted when the app last closed go back in the queue. */
  recoverInterrupted(): void {
    for (const r of Object.values(this.data.reviews)) {
      if (r.state === "running") {
        r.state = "queued";
        delete r.progress;
      }
    }
  }

  save(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 200);
  }

  flush(): void {
    clearTimeout(this.timer);
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data));
    renameSync(tmp, this.file);
  }
}
