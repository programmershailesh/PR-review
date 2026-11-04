import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { convertDocument, validateDocument } from "./convert";

const dir = mkdtempSync(path.join(tmpdir(), "code-reviewer-convert-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** The smallest valid PDF that has one page of text. */
function minimalPdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => (out += `${String(o).padStart(10, "0")} 00000 n \n`));
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

describe("validateDocument", () => {
  it("accepts supported files", () => {
    for (const n of ["a.pdf", "a.DOCX", "a.md", "a.txt"]) expect(validateDocument(n, 10)).toBeUndefined();
  });
  it("rejects unsupported, oversized and empty files with a clear reason", () => {
    expect(validateDocument("a.exe", 10)).toMatch(/supported/);
    expect(validateDocument("a.pdf", 26 * 1024 * 1024)).toMatch(/25 MB/);
    expect(validateDocument("a.txt", 0)).toMatch(/empty/);
  });
});

describe("convertDocument", () => {
  it("reads text files", async () => {
    const f = path.join(dir, "a.md");
    writeFileSync(f, "# Rules\nUse tabs\n");
    expect(await convertDocument(f)).toContain("Use tabs");
  });
  it("extracts PDF text with page markers", async () => {
    const f = path.join(dir, "a.pdf");
    writeFileSync(f, minimalPdf("Never store card numbers"));
    const text = await convertDocument(f);
    expect(text).toContain("<!-- page 1 -->");
    expect(text).toContain("Never store card numbers");
  });
  it("reports a PDF with no text instead of silently ignoring it", async () => {
    const f = path.join(dir, "scan.pdf");
    writeFileSync(f, minimalPdf(""));
    await expect(convertDocument(f)).rejects.toThrow(/no readable text/);
  });
  it("reports a broken Word file", async () => {
    const f = path.join(dir, "bad.docx");
    writeFileSync(f, "not a zip");
    await expect(convertDocument(f)).rejects.toThrow();
  });
});
