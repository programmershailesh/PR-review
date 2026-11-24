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

  it("has the 15 first-release standards, each with a checklist", () => {
    expect(available.map((s) => s.id).sort()).toEqual(
      ["ccpa", "csp", "dpdp", "gdpr", "hipaa", "iso27001", "owasp-api", "owasp-asvs", "owasp-llm", "owasp-top10", "pci-dss", "slsa", "soc2", "ssdf", "wcag"],
    );
    for (const s of available) expect(catalog.controls.get(s.id)?.length, s.id).toBeGreaterThanOrEqual(5);
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

  it("lists planned standards without claiming they can be checked", () => {
    const planned = catalog.standards.filter((s) => s.status === "planned");
    expect(planned.length).toBeGreaterThanOrEqual(35);
    for (const s of planned) expect(catalog.controls.has(s.id)).toBe(false);
  });
});
