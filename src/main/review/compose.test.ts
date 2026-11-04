import { describe, expect, it } from "vitest";
import type { Finding, ReviewResult } from "../../shared/types";
import { composeReview } from "./compose";

const finding = (over: Partial<Finding>): Finding => ({
  severity: "major",
  dimension: "correctness",
  file: "a.ts",
  line: 1,
  title: "Title",
  problem: "Problem.",
  impact: "Impact.",
  betterApproach: "Better.",
  confidence: "high",
  challenge: { outcome: "survived", note: "" },
  ...over,
});
const result = (findings: Finding[]): ReviewResult =>
  ({ summary: "Summary.", findings }) as unknown as ReviewResult;
const DIFF = "diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1,2 @@\n one\n+two\n";

describe("composeReview", () => {
  it("posts findings on diff lines as inline comments", () => {
    const out = composeReview(result([finding({ line: 2 })]), {}, DIFF, "comment");
    expect(out.comments).toHaveLength(1);
    expect(out.comments[0]).toMatchObject({ path: "a.ts", line: 2 });
    expect(out.comments[0]!.body).toContain("Should fix");
    expect(out.body).toBe("Summary.");
  });
  it("moves findings outside the diff into the summary, so the post can't be rejected", () => {
    const out = composeReview(result([finding({ line: 99 }), finding({ file: "other.ts" })]), {}, DIFF, "comment");
    expect(out.comments).toHaveLength(0);
    expect(out.body).toContain("a.ts, line 99");
    expect(out.body).toContain("other.ts, line 1");
  });
  it("leaves out findings the user turned off", () => {
    const out = composeReview(result([finding({ line: 2 }), finding({ line: 1 })]), { 0: { included: false } }, DIFF, "approve");
    expect(out.comments.map((c) => c.line)).toEqual([1]);
    expect(out.event).toBe("approve");
  });
  it("uses the user's edited wording", () => {
    const out = composeReview(result([finding({ line: 2 })]), { 0: { included: true, text: "My words" } }, DIFF, "comment");
    expect(out.comments[0]!.body).toBe("My words");
  });
});
