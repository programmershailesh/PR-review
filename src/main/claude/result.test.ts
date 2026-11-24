import { describe, expect, it } from "vitest";
import { bundleRelative, parseReviewResult } from "./result";

const dim = { status: "pass", note: "" };
const base = {
  verdict: "approve", summary: "s", stack: [], dimensions: { architecture: dim, performance: dim, security: dim, correctness: dim, stack: dim, requirements: dim },
  requirements: [], rejected: [], praise: [], challengeStats: { raised: 0, rejected: 0, downgraded: 0, kept: 0 }, coverage: { filesReviewed: 1, filesSkipped: [] },
};
const finding = (file: string, extra: object = {}) => ({
  severity: "minor", dimension: "security", file, line: 1, title: "t", problem: "p", impact: "i", betterApproach: "b", confidence: "high", challenge: { outcome: "survived", note: "n" }, ...extra,
});

describe("parseReviewResult", () => {
  it("makes paths relative to the PR's code, as a real run showed models don't always", () => {
    const r = parseReviewResult({ ...base, findings: [finding("head/server.js"), finding("./head/src/a.ts"), finding("head\\src\\b.ts"), finding("src/headers.ts")] });
    expect(r.findings.map((f) => f.file)).toEqual(["server.js", "src/a.ts", "src/b.ts", "src/headers.ts"]);
  });

  it("accepts compliance results and controls, and results from before 1.4.0 without them", () => {
    const r = parseReviewResult({ ...base, findings: [finding("a.ts", { dimension: "compliance", controls: ["PCI DSS 3.5.1"] })], compliance: [{ standard: "pci-dss", status: "issues", note: "n" }] });
    expect(r.findings[0]!.controls).toEqual(["PCI DSS 3.5.1"]);
    expect(r.compliance).toHaveLength(1);
    expect(parseReviewResult({ ...base, findings: [] }).compliance).toBeUndefined();
  });

  it("rejects an unknown compliance status", () => {
    expect(() => parseReviewResult({ ...base, findings: [], compliance: [{ standard: "x", status: "compliant", note: "" }] })).toThrow();
  });
});

describe("bundleRelative", () => {
  it("leaves ordinary paths alone", () => {
    expect(bundleRelative("headless/a.ts")).toBe("headless/a.ts");
    expect(bundleRelative("base.ts")).toBe("base.ts");
  });
});
