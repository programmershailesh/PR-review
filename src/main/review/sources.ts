import { existsSync } from "node:fs";
import path from "node:path";
import type { ReviewResult } from "../../shared/types";

export interface KnownSources {
  bundleDir: string;
  docTitles: string[];
  hasQuickRules: boolean;
  description: string;
  linkedIssues: string[];
}

function fileExistsIn(root: string, candidate: string): boolean {
  const target = path.resolve(root, candidate);
  // A citation is model output, so it must not be able to probe outside the folder.
  return target.startsWith(path.resolve(root) + path.sep) && existsSync(target);
}

/** True only if a citation points at something that really exists for this review. */
export function isRealSource(source: string, known: KnownSources): boolean {
  const lower = source.toLowerCase();
  if (known.docTitles.some((t) => lower.includes(t.toLowerCase()))) return true;
  if (known.hasQuickRules && /quick rule|rules\.md/.test(lower)) return true;
  if (known.description.trim() && /\b(pr|mr|pull request|merge request) description\b/.test(lower)) return true;
  if (known.linkedIssues.some((r) => source.includes(r))) return true;
  for (const ticket of source.match(/\b[A-Z][A-Z0-9]+-\d+\b/g) ?? []) {
    if (known.description.includes(ticket)) return true;
  }
  for (const token of source.match(/[\w.@-]+(?:\/[\w.@-]+)*/g) ?? []) {
    if (!token.includes("/") && !token.includes(".")) continue;
    const clean = token.replace(/^base\//, "").replace(/\.$/, "");
    if (fileExistsIn(path.join(known.bundleDir, "base"), clean)) return true;
  }
  return false;
}

/** Removes citations that can't be verified. The finding stays, because only its source is in doubt. */
export function verifyRuleSources(result: ReviewResult, known: KnownSources): ReviewResult {
  return {
    ...result,
    findings: result.findings.map((f) => {
      if (!f.ruleSource || isRealSource(f.ruleSource, known)) return f;
      const { ruleSource: _removed, ...rest } = f;
      return rest;
    }),
  };
}
