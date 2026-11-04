import { z } from "zod";
import type { ReviewResult } from "../../shared/types";

const severity = z.enum(["blocker", "major", "minor", "nit"]);
const dimension = z.object({ status: z.enum(["pass", "watch", "block", "not_applicable"]), note: z.string() });

/** The CLI validates against the JSON schema too. This protects the UI from anything unexpected. */
const reviewResult = z.object({
  verdict: z.enum(["approve", "approve_with_comments", "needs_discussion", "request_changes"]),
  summary: z.string(),
  stack: z.array(z.object({ name: z.string(), version: z.string().optional(), paths: z.array(z.string()) })),
  dimensions: z.object({
    architecture: dimension,
    performance: dimension,
    security: dimension,
    correctness: dimension,
    stack: dimension,
    requirements: dimension,
  }),
  requirements: z.array(
    z.object({
      requirement: z.string(),
      source: z.string(),
      status: z.enum(["met", "partial", "missing", "unclear"]),
      evidence: z.string(),
    }),
  ),
  findings: z.array(
    z.object({
      severity,
      dimension: z.enum(["architecture", "performance", "security", "correctness", "stack", "requirements"]),
      file: z.string(),
      line: z.number().int(),
      endLine: z.number().int().optional(),
      title: z.string(),
      problem: z.string(),
      impact: z.string(),
      betterApproach: z.string(),
      suggestedCode: z.string().optional(),
      ruleSource: z.string().optional(),
      confidence: z.enum(["high", "medium"]),
      challenge: z.object({
        outcome: z.enum(["survived", "downgraded"]),
        originalSeverity: severity.optional(),
        note: z.string(),
      }),
    }),
  ),
  rejected: z.array(z.object({ title: z.string(), raisedBy: z.string().optional(), reason: z.string() })),
  challengeStats: z.object({
    raised: z.number().int(),
    rejected: z.number().int(),
    downgraded: z.number().int(),
    kept: z.number().int(),
  }),
  coverage: z.object({
    filesReviewed: z.number().int(),
    filesSkipped: z.array(z.object({ path: z.string(), reason: z.string() })),
  }),
  praise: z.array(z.string()),
  guidelinesUsed: z.array(z.string()).optional(),
});

export function parseReviewResult(value: unknown): ReviewResult {
  return reviewResult.parse(value) as ReviewResult;
}
