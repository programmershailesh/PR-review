import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const MAX_DOC_BYTES = 25 * 1024 * 1024;
const SUPPORTED = new Set([".pdf", ".docx", ".md", ".txt"]);

/** Returns a plain-language reason the file can't be used, or undefined when it can. */
export function validateDocument(name: string, size: number): string | undefined {
  if (!SUPPORTED.has(path.extname(name).toLowerCase())) {
    return `"${name}" isn't a supported file type. Use PDF, Word (.docx), Markdown or text.`;
  }
  if (size > MAX_DOC_BYTES) return `"${name}" is larger than 25 MB.`;
  if (size === 0) return `"${name}" is empty.`;
  return undefined;
}

async function pdfToText(file: string): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(await readFile(file)));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = text as unknown as string[];
  if (!pages.some((p) => p.trim())) {
    throw new Error("This PDF has no readable text. It may be a scan. Export it with text, or use a Word or text version.");
  }
  // Page markers let findings cite "page 12".
  return pages.map((p, i) => `<!-- page ${i + 1} -->\n${p.trim()}`).join("\n\n");
}

async function docxToText(file: string): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await (mammoth.default ?? mammoth).extractRawText({ path: file });
  if (!value.trim()) throw new Error("This Word document has no readable text.");
  return value;
}

/** Converts a guideline document to the text the reviewers read. */
export async function convertDocument(file: string): Promise<string> {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".pdf") return pdfToText(file);
  if (ext === ".docx") return docxToText(file);
  const text = await readFile(file, "utf8");
  if (!text.trim()) throw new Error("This file has no text.");
  return text;
}

export async function fileSize(file: string): Promise<number> {
  return (await stat(file)).size;
}
