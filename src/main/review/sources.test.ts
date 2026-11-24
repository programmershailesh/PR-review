import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { Finding, ReviewResult } from "../../shared/types";
import { isRealSource, verifyControls, verifyRuleSources, type KnownSources } from "./sources";

const dir = mkdtempSync(path.join(tmpdir(), "code-reviewer-sources-"));
mkdirSync(path.join(dir, "base", "docs", "adr"), { recursive: true });
writeFileSync(path.join(dir, "base", "CONTRIBUTING.md"), "x");
writeFileSync(path.join(dir, "base", "docs", "adr", "007.md"), "x");
writeFileSync(path.join(dir, "secret.txt"), "x");
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const known: KnownSources = {
  bundleDir: dir,
  docTitles: ["Demo Standards.pdf"],
  hasQuickRules: false,
  description: "Implements PAY-311. Must return null.",
  linkedIssues: ["#7"],
};

describe("isRealSource", () => {
  it.each([
    "guidelines/01-standards.md (Demo Standards.pdf, page 2, level must): Never use SELECT *",
    "demo standards.pdf, page 2",
    "PR description: Must return null when no user matches.",
    "CONTRIBUTING.md, Validation",
    "base/docs/adr/007.md",
    "Ticket PAY-311, acceptance criterion 3",
    "Issue #7",
  ])("accepts %s", (source) => {
    expect(isRealSource(source, known)).toBe(true);
  });

  it.each([
    "Security baseline: parameterise all query inputs",
    "OWASP Top 10",
    "Other Handbook.pdf, page 3",
    "CODING_STANDARDS.md",
    "Ticket ABC-999",
    "Issue #8",
    "Quick rule: no floats",
  ])("rejects %s", (source) => {
    expect(isRealSource(source, known)).toBe(false);
  });

  it("can't be used to probe for files outside the code", () => {
    expect(isRealSource("../secret.txt", known)).toBe(false);
  });

  it("accepts quick rules only when the project has some", () => {
    expect(isRealSource("Quick rule: no floats", { ...known, hasQuickRules: true })).toBe(true);
  });

  it("doesn't accept the description as a source when there isn't one", () => {
    expect(isRealSource("PR description", { ...known, description: "  " })).toBe(false);
  });
});

describe("verifyRuleSources", () => {
  const finding = (ruleSource?: string) => ({ title: "t", severity: "blocker", ...(ruleSource ? { ruleSource } : {}) }) as Finding;
  it("removes only the made-up citation and keeps every finding", () => {
    const result = { findings: [finding("Security baseline: parameterise"), finding("Demo Standards.pdf, page 2"), finding()] } as ReviewResult;
    const out = verifyRuleSources(result, known);
    expect(out.findings).toHaveLength(3);
    expect("ruleSource" in out.findings[0]!).toBe(false);
    expect(out.findings[0]!.severity).toBe("blocker");
    expect(out.findings[1]!.ruleSource).toBe("Demo Standards.pdf, page 2");
    expect("ruleSource" in out.findings[2]!).toBe(false);
  });
});

describe("verifyControls", () => {
  const base = { findings: [], compliance: [] } as unknown as ReviewResult;
  const f = (controls?: string[]) => ({ title: "t", ...(controls ? { controls } : {}) }) as unknown as ReviewResult["findings"][number];
  const selected = [
    { id: "pci-dss", controls: ["PCI DSS 3.5.1", "PCI DSS 8.6.2"] },
    { id: "csp", controls: ["CSP script-src"] },
  ];

  it("keeps known controls written the checklist's way, and drops the rest", () => {
    const out = verifyControls({ ...base, findings: [f(["pci dss 3.5.1.", "PCI DSS 3.5.1", "PCI DSS 12.1", "csp script-src"]), f(["Made up"]), f()] }, selected);
    expect(out.findings[0]!.controls).toEqual(["PCI DSS 3.5.1", "CSP script-src"]);
    expect(out.findings[1]).not.toHaveProperty("controls");
    expect(out.findings[2]).not.toHaveProperty("controls");
  });

  it("makes statuses agree with the findings, and covers every selected standard", () => {
    const out = verifyControls(
      {
        ...base,
        findings: [f(["PCI DSS 8.6.2"])],
        compliance: [
          { standard: "pci-dss", status: "pass", note: "x" },
          { standard: "csp", status: "issues", note: "Inline scripts." },
          { standard: "gdpr", status: "issues", note: "Not selected." },
        ],
      },
      selected,
    );
    expect(out.compliance).toEqual([
      { standard: "pci-dss", status: "issues", note: "Issues were found. See the issues that list its controls." },
      { standard: "csp", status: "needs_check", note: "Inline scripts. No confirmed issue cites a specific control, so check this yourself." },
    ]);
  });

  it("keeps a reported status when it agrees", () => {
    const out = verifyControls({ ...base, compliance: [{ standard: "csp", status: "not_applicable", note: "No headers changed." }] }, selected.slice(1));
    expect(out.compliance).toEqual([{ standard: "csp", status: "not_applicable", note: "No headers changed." }]);
  });
});
