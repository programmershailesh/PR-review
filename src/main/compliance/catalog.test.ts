import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCatalog, normaliseControl, parseControls } from "./catalog";

const ENGINE = path.resolve(__dirname, "../../../review-engine");
const DIR = path.join(ENGINE, "compliance");

describe("parseControls", () => {
  it("reads check headings and nothing else", () => {
    const md = "# T\n\n### [PCI DSS 3.5.1] Stored card numbers are unreadable\nLook for: x\n### Not a check\n## [Not a check] either\n### [CSP script-src] Scripts can't run\n";
    expect(parseControls(md)).toEqual(["PCI DSS 3.5.1", "CSP script-src"]);
  });
  it("compares control IDs the way people write them", () => {
    expect(normaliseControl(" PCI  dss 3.5.1. ")).toBe(normaliseControl("PCI DSS 3.5.1"));
  });
});

/** These check the shipped checklists, so a broken one fails the build rather than a review. */
describe("shipped catalogue and checklists", () => {
  const catalog = loadCatalog(ENGINE);
  const available = catalog.standards.filter((s) => s.status === "available");

  it("has every catalogued standard available, each with a checklist of at least 10 checks", () => {
    expect(available.map((s) => s.id).sort()).toEqual([
      "ada-title-2", "appi", "ccpa", "cfr-part-11", "cis-controls", "cjis", "cmmc", "coppa", "cra", "csa-star", "csp", "cwe-top25",
      "cyber-essentials", "dora", "dpdp", "eaa", "essential-eight", "eu-ai-act", "fedramp", "ferpa", "fips-140", "gdpr", "glba",
      "hipaa", "hitrust", "iec-62304", "iec62443", "iso21434", "iso26262", "iso27001", "iso42001", "lgpd", "misra-c", "nis2",
      "nist-800-53", "nist-ai-rmf", "nist-csf", "owasp-api", "owasp-asvs", "owasp-llm", "owasp-masvs", "owasp-top10", "pci-dss",
      "pci-sss", "pdpa-sg", "pipeda", "psd2", "section-508", "sei-cert", "slsa", "soc2", "sox", "ssdf", "swift-csp", "wcag",
    ]);
    for (const s of available) expect(catalog.controls.get(s.id)?.length, s.id).toBeGreaterThanOrEqual(10);
  });

  it("records when each standard was last checked against its source", () => {
    for (const s of available) expect(s.lastReviewed, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("has no checklist files without a catalogue entry", () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
    expect(files.sort()).toEqual(available.map((s) => s.id).sort());
  });

  it("uses each control ID once, across every checklist, so a citation names one standard", () => {
    const seen = new Map<string, string>();
    for (const [id, controls] of catalog.controls) {
      for (const c of controls) {
        const key = normaliseControl(c);
        expect(seen.get(key), `${c} in ${id} is also in ${seen.get(key)}`).toBeUndefined();
        seen.set(key, id);
      }
    }
  });

  it("gives every check what to look for and whether code can decide it", () => {
    for (const s of available) {
      const md = readFileSync(path.join(DIR, `${s.id}.md`), "utf8");
      expect(md, s.id).toMatch(/^## When this applies$/m);
      expect(md, s.id).toMatch(/^Source/m);
      const sections = md.split(/^### \[/m).slice(1);
      for (const sec of sections) {
        const heading = sec.split("\n")[0];
        expect(sec, `${s.id}: ${heading}`).toMatch(/Look for:/);
        expect(sec, `${s.id}: ${heading}`).toMatch(/Decided from code: (yes|partly|no)/);
      }
    }
  });

  it("never cites WCAG 4.1.1, which WCAG 2.2 removed", () => {
    expect(catalog.controls.get("wcag")?.some((c) => /4\.1\.1\b/.test(c))).toBe(false);
  });

  it("never claims a planned standard can be checked", () => {
    for (const s of catalog.standards.filter((x) => x.status === "planned")) expect(catalog.controls.has(s.id)).toBe(false);
  });
});
