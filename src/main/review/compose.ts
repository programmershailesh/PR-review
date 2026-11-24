import { commentableLines, parseDiff } from "../../shared/diff";
import type { Finding, FindingDraft, ReviewResult, SendEvent } from "../../shared/types";
import type { InlineComment, ReviewSubmission } from "../providers/types";

export const SEVERITY_LABEL: Record<Finding["severity"], string> = {
  blocker: "Must fix",
  major: "Should fix",
  minor: "Nice to have",
  nit: "Nice to have",
};

function defaultComment(f: Finding): string {
  const parts = [`**${SEVERITY_LABEL[f.severity]}: ${f.title}**`, f.problem, f.impact, `**A better way:** ${f.betterApproach}`];
  if (f.suggestedCode) parts.push("```\n" + f.suggestedCode + "\n```");
  if (f.ruleSource) parts.push(`Based on: ${f.ruleSource}`);
  if (f.controls?.length) parts.push(`Related controls: ${f.controls.join(", ")}`);
  return parts.join("\n\n");
}

/**
 * Builds what gets posted. Providers reject inline comments on lines outside the diff,
 * which would fail the whole review, so those findings move into the summary instead.
 */
export function composeReview(
  result: ReviewResult,
  drafts: Record<number, FindingDraft>,
  diff: string,
  event: SendEvent,
): ReviewSubmission {
  const allowed = commentableLines(parseDiff(diff));
  const comments: InlineComment[] = [];
  const outside: string[] = [];
  result.findings.forEach((f, i) => {
    const draft = drafts[i];
    if (draft && !draft.included) return;
    const body = draft?.text?.trim() || defaultComment(f);
    const anchor = allowed.get(f.file)?.get(f.line);
    if (anchor) comments.push({ path: f.file, line: f.line, body, ...anchor });
    else outside.push(`**${f.file}, line ${f.line}**\n\n${body}`);
  });
  const body = [result.summary, ...outside].join("\n\n---\n\n");
  return { event, body, comments };
}
