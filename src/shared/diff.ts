export type DiffLineKind = "add" | "del" | "ctx";

export interface DiffLine {
  kind: DiffLineKind;
  oldLine?: number;
  newLine?: number;
  text: string;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  path: string;
  hunks: DiffHunk[];
  binary: boolean;
}

const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/;

/** Reads a path from a "+++ b/x" line, including git's quoted form for unusual names. */
function parsePath(raw: string): string {
  let p = raw.trim();
  if (p.startsWith('"') && p.endsWith('"')) {
    try {
      p = JSON.parse(p) as string;
    } catch {
      p = p.slice(1, -1);
    }
  }
  return p.replace(/^[ab]\//, "");
}

export function parseDiff(patch: string): DiffFile[] {
  const files: DiffFile[] = [];
  let file: DiffFile | undefined;
  let hunk: DiffHunk | undefined;
  let oldNo = 0;
  let newNo = 0;

  for (const line of patch.split("\n")) {
    if (line.startsWith("diff --git ")) {
      const m = /^diff --git (?:"?a\/.*"?) ("?b\/.*"?)$/.exec(line);
      file = { path: m?.[1] ? parsePath(m[1]) : "", hunks: [], binary: false };
      files.push(file);
      hunk = undefined;
      continue;
    }
    if (!file) continue;
    if (!hunk) {
      if (line.startsWith("+++ ") && !line.startsWith("+++ /dev/null")) {
        file.path = parsePath(line.slice(4));
      } else if (line.startsWith("Binary files ")) {
        file.binary = true;
      }
    }
    const m = HUNK.exec(line);
    if (m) {
      oldNo = Number(m[1]);
      newNo = Number(m[2]);
      hunk = { header: line, lines: [] };
      file.hunks.push(hunk);
      continue;
    }
    if (!hunk) continue;
    const text = line.endsWith("\r") ? line.slice(0, -1) : line;
    const mark = text[0];
    if (mark === "+") hunk.lines.push({ kind: "add", newLine: newNo++, text: text.slice(1) });
    else if (mark === "-") hunk.lines.push({ kind: "del", oldLine: oldNo++, text: text.slice(1) });
    else if (mark === " ") hunk.lines.push({ kind: "ctx", oldLine: oldNo++, newLine: newNo++, text: text.slice(1) });
    // "\ No newline at end of file" and the trailing empty line carry no content.
  }
  return files;
}

/** Providers only accept inline comments on lines that appear in the diff. */
export function commentableLines(files: DiffFile[]): Map<string, Set<number>> {
  const map = new Map<string, Set<number>>();
  for (const f of files) {
    const set = new Set<number>();
    for (const h of f.hunks) for (const l of h.lines) if (l.newLine !== undefined) set.add(l.newLine);
    map.set(f.path, set);
  }
  return map;
}
