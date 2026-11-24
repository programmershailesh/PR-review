import { existsSync } from "node:fs";
import path from "node:path";
import type { ComplianceResult, ReviewResult } from "../../shared/types";
import { normaliseControl } from "../compliance/catalog";

export interface KnownSources {
  bundleDir: string;
  docTitles: string[];
  hasQuickRules: boolean;
  description: string;
  linkedIssues: string[];
  /** Names of the selected compliance standards, such as "PCI DSS". */
  standardNames?: string[];
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
  if ((known.standardNames ?? []).some((n) => lower.includes(n.toLowerCase()))) return true;
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

export interface SelectedStandard {
  id: string;
  /** Every control ID in the standard's checklist. */
  controls: string[];
}

/**
 * Keeps only control IDs that exist in the selected checklists, written exactly as the checklist
 * writes them, and makes each standard's status agree with the findings that cite it.
 * A finding stays even if all its controls go, because only the citation is in doubt.
 */
export function verifyControls(result: ReviewResult, selected: SelectedStandard[]): ReviewResult {
  const owner = new Map<string, { standard: string; id: string }>();
  for (const s of selected) for (const id of s.controls) owner.set(normaliseControl(id), { standard: s.id, id });
  const cited = new Set<string>();
  const findings = result.findings.map((f) => {
    if (!f.controls) return f;
    const kept = new Set<string>();
    for (const c of f.controls) {
      const o = owner.get(normaliseControl(c));
      if (!o) continue;
      kept.add(o.id);
      cited.add(o.standard);
    }
    const { controls: _removed, ...rest } = f;
    return kept.size ? { ...rest, controls: [...kept] } : rest;
  });

  const reported = new Map<string, ComplianceResult>();
  for (const c of result.compliance ?? []) if (!reported.has(c.standard)) reported.set(c.standard, c);
  const compliance = selected.map((s): ComplianceResult => {
    const r = reported.get(s.id);
    if (cited.has(s.id)) {
      return r?.status === "issues" ? r : { standard: s.id, status: "issues", note: "Issues were found. See the issues that list its controls." };
    }
    if (!r) return { standard: s.id, status: "needs_check", note: "The reviewer didn't report on this standard, so check it yourself." };
    if (r.status === "issues") {
      // Claimed issues that no surviving finding backs up can't be shown to the user as issues.
      return { standard: s.id, status: "needs_check", note: `${r.note} No confirmed issue cites a specific control, so check this yourself.`.trim() };
    }
    return r;
  });
  return { ...result, findings, compliance };
}
