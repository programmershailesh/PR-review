import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GuidelineDoc, PullRequest } from "../../shared/types";
import type { PrDetails } from "../providers/types";

const GIT_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_OUTPUT = 512 * 1024 * 1024;

/**
 * Settings applied to every git command touching PR content. A PR's symlink could
 * otherwise point at a private file outside the bundle and get read by the reviewer.
 */
const SAFE_CONFIG = [
  "-c", "core.symlinks=false",
  "-c", "core.autocrlf=false",
  "-c", "core.longpaths=true",
  "-c", "core.hooksPath=",
  "-c", "core.fsmonitor=false",
  "-c", "protocol.ext.allow=never",
];

function git(args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      [...SAFE_CONFIG, ...args],
      {
        cwd: options.cwd,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_LFS_SKIP_SMUDGE: "1", ...options.env },
        timeout: GIT_TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT,
        windowsHide: true,
        encoding: "utf8",
      },
      (err, stdout, stderr) => {
        if (err) {
          const code = (err as NodeJS.ErrnoException).code;
          reject(
            new Error(
              code === "ENOENT"
                ? "Git isn't installed, or Code Reviewer can't find it."
                : `Git failed: ${String(stderr || err.message).slice(0, 500)}`,
            ),
          );
        } else resolve(stdout);
      },
    );
  });
}

/** Passes the auth header through the environment, so it never shows in a process list or on disk. */
function authEnv(authHeader: string): NodeJS.ProcessEnv {
  if (!authHeader) return {};
  return {
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "http.extraHeader",
    GIT_CONFIG_VALUE_0: authHeader,
  };
}

/** Writes one commit's files into target, with no .git folder, hooks or filters. */
async function exportCommit(cacheDir: string, sha: string, target: string): Promise<void> {
  await mkdir(target, { recursive: true });
  const indexFile = `${target}.index`;
  const env = { GIT_DIR: cacheDir, GIT_WORK_TREE: target, GIT_INDEX_FILE: indexFile };
  await git(["read-tree", sha], { env });
  await git(["checkout-index", "--all", "--force"], { env });
  await rm(indexFile, { force: true });
}

export interface BundleInput {
  pr: PullRequest;
  details: PrDetails;
  remote: { url: string; authHeader: string };
  /** Enabled guideline documents, each with the path to its converted text. */
  docs: { doc: GuidelineDoc; textPath: string }[];
  rules: string[];
  cacheRoot: string;
  bundleRoot: string;
}

export interface Bundle {
  dir: string;
  diff: string;
}

function safeDocFileName(index: number, name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 60) || "document";
  return `${String(index + 1).padStart(2, "0")}-${base}.md`;
}

export async function prepareBundle(input: BundleInput): Promise<Bundle> {
  const { pr, details, remote } = input;
  const id = createHash("sha256").update(`${pr.key}:${pr.headSha}`).digest("hex").slice(0, 16);
  const repoId = createHash("sha256").update(remote.url).digest("hex").slice(0, 16);
  const cacheDir = path.join(input.cacheRoot, `${repoId}.git`);
  const dir = path.join(input.bundleRoot, id);

  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await mkdir(input.cacheRoot, { recursive: true });

  await git(["init", "--bare", "--quiet", cacheDir]);
  const shas = [...new Set([details.mergeBaseSha, pr.headSha])];
  // Fetching just these two commits keeps this fast, even in very large repositories.
  await git(["--git-dir", cacheDir, "fetch", "--quiet", "--depth=1", "--no-tags", remote.url, ...shas], {
    env: authEnv(remote.authHeader),
  });

  await exportCommit(cacheDir, details.mergeBaseSha, path.join(dir, "base"));
  await exportCommit(cacheDir, pr.headSha, path.join(dir, "head"));

  const diffArgs = ["--git-dir", cacheDir, "diff", "--no-color", "--no-ext-diff", "--no-textconv"];
  const range = [details.mergeBaseSha, pr.headSha];
  const diff = await git([...diffArgs, ...range]);
  const numstat = await git([...diffArgs, "--numstat", ...range]);
  const changedFiles = numstat
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [add, del, ...rest] = line.split("\t");
      return { path: rest.join("\t"), additions: add === "-" ? null : Number(add), deletions: del === "-" ? null : Number(del) };
    });

  await writeFile(path.join(dir, "diff.patch"), diff);
  await writeFile(path.join(dir, "changed-files.json"), JSON.stringify(changedFiles, null, 2));
  await writeFile(
    path.join(dir, "pr.json"),
    JSON.stringify(
      {
        provider: pr.provider,
        repository: pr.repo,
        number: pr.number,
        title: pr.title,
        author: pr.author,
        description: pr.description,
        baseBranch: pr.baseRef,
        headBranch: pr.headRef,
        linkedIssues: details.linkedIssues,
        comments: details.comments,
      },
      null,
      2,
    ),
  );

  if (input.docs.length || input.rules.length) {
    const guidelines = path.join(dir, "guidelines");
    await mkdir(guidelines, { recursive: true });
    const index = [];
    for (const [i, { doc, textPath }] of input.docs.entries()) {
      const file = safeDocFileName(i, doc.name);
      await copyFile(textPath, path.join(guidelines, file));
      index.push({
        file,
        title: doc.name,
        level: doc.level,
        scope: doc.scope === "*" ? "all" : "project",
      });
    }
    await writeFile(path.join(guidelines, "index.json"), JSON.stringify(index, null, 2));
    if (input.rules.length) {
      await writeFile(path.join(guidelines, "rules.md"), input.rules.map((r) => `- ${r}`).join("\n") + "\n");
    }
  }
  return { dir, diff };
}

export async function removeBundle(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true, maxRetries: 3 });
}
