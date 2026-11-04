import { describe, expect, it } from "vitest";
import { commentableLines, parseDiff } from "./diff";

const PATCH = [
  "diff --git a/src/a.ts b/src/a.ts",
  "index 111..222 100644",
  "--- a/src/a.ts",
  "+++ b/src/a.ts",
  "@@ -10,3 +10,4 @@ function x() {",
  " keep",
  "-old",
  "+new one",
  "+new two",
  " tail",
  "\\ No newline at end of file",
  "diff --git a/img.png b/img.png",
  "Binary files a/img.png and b/img.png differ",
  "diff --git a/gone.ts b/gone.ts",
  "--- a/gone.ts",
  "+++ /dev/null",
  "@@ -1 +0,0 @@",
  "-bye",
  "",
].join("\n");

describe("parseDiff", () => {
  const files = parseDiff(PATCH);
  it("assigns the right line numbers", () => {
    expect(files[0]!.path).toBe("src/a.ts");
    expect(files[0]!.hunks[0]!.lines).toEqual([
      { kind: "ctx", oldLine: 10, newLine: 10, text: "keep" },
      { kind: "del", oldLine: 11, text: "old" },
      { kind: "add", newLine: 11, text: "new one" },
      { kind: "add", newLine: 12, text: "new two" },
      { kind: "ctx", oldLine: 12, newLine: 13, text: "tail" },
    ]);
  });
  it("marks binary files and keeps deleted paths", () => {
    expect(files[1]).toMatchObject({ path: "img.png", binary: true });
    expect(files[2]!.path).toBe("gone.ts");
  });
  it("handles Windows line endings", () => {
    const f = parseDiff("diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\r\n+b\r\n");
    expect(f[0]!.hunks[0]!.lines[1]!.text).toBe("b");
  });
});

describe("commentableLines", () => {
  it("lists only lines that exist on the new side of the diff", () => {
    const lines = commentableLines(parseDiff(PATCH));
    expect([...lines.get("src/a.ts")!.keys()]).toEqual([10, 11, 12, 13]);
    expect(lines.get("gone.ts")!.size).toBe(0);
  });
  it("records where each line was before the change, which GitLab needs to place a comment", () => {
    const patch = "diff --git a/old.ts b/new.ts\nsimilarity index 90%\nrename from old.ts\nrename to new.ts\n--- a/old.ts\n+++ b/new.ts\n@@ -5,2 +7,3 @@\n same\n+added\n-removed\n also same\n";
    const lines = commentableLines(parseDiff(patch)).get("new.ts")!;
    expect(lines.get(7)).toEqual({ oldPath: "old.ts", oldLine: 5 });
    expect(lines.get(8)).toEqual({ oldPath: "old.ts" });
    expect(lines.get(9)).toEqual({ oldPath: "old.ts", oldLine: 7 });
  });
  it("uses the new path for a file that didn't exist before", () => {
    const patch = "diff --git a/n.ts b/n.ts\nnew file mode 100644\n--- /dev/null\n+++ b/n.ts\n@@ -0,0 +1 @@\n+x\n";
    expect(commentableLines(parseDiff(patch)).get("n.ts")!.get(1)).toEqual({ oldPath: "n.ts" });
  });
});
