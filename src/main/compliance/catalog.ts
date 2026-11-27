import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ComplianceStandard } from "../../shared/types";

const standard = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  shortName: z.string().min(1).optional(),
  category: z.string().min(1),
  region: z.string().min(1),
  version: z.string().optional(),
  sourceUrl: z.string().url().startsWith("https://").optional(),
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  summary: z.string().optional(),
  status: z.enum(["available", "planned"]),
});

/** A check heading in a checklist: "### [PCI DSS 3.5.1] Stored card numbers are unreadable". */
const CHECK = /^### \[([^\]\n]+)\] \S/gm;

export interface Catalog {
  standards: ComplianceStandard[];
  /** The control IDs in each available standard's checklist, keyed by standard id. */
  controls: Map<string, string[]>;
  /** Where an available standard's checklist lives. */
  checklistPath(id: string): string;
}

/** The control IDs a checklist defines, in order. */
export function parseControls(markdown: string): string[] {
  return [...markdown.matchAll(CHECK)].map((m) => (m[1] as string).trim());
}

/** Compares control IDs the way people write them: case, spacing and a trailing full stop don't matter. */
export function normaliseControl(id: string): string {
  return id.trim().replace(/\.$/, "").replace(/\s+/g, " ").toLowerCase();
}

/**
 * Reads the catalogue and the checklists shipped in review-engine/compliance.
 * An available standard without a readable checklist, or with no checks, is a packaging
 * mistake, so it fails loudly here rather than letting reviews cite nothing.
 */
export function loadCatalog(enginePath: string): Catalog {
  const dir = path.join(enginePath, "compliance");
  const raw = JSON.parse(readFileSync(path.join(dir, "catalog.json"), "utf8")) as { standards: unknown };
  const standards = z.array(standard).parse(raw.standards) as ComplianceStandard[];
  const ids = new Set<string>();
  const controls = new Map<string, string[]>();
  for (const s of standards) {
    if (ids.has(s.id)) throw new Error(`The standard "${s.id}" is listed twice.`);
    ids.add(s.id);
    if (s.status !== "available") continue;
    if (!s.shortName || !s.version || !s.sourceUrl || !s.lastReviewed || !s.summary) throw new Error(`The standard "${s.id}" is missing details.`);
    const list = parseControls(readFileSync(path.join(dir, `${s.id}.md`), "utf8"));
    if (!list.length) throw new Error(`The checklist for "${s.id}" has no checks.`);
    controls.set(s.id, list);
  }
  return { standards, controls, checklistPath: (id) => path.join(dir, `${id}.md`) };
}
