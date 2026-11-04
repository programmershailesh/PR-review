import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrateUserData } from "./migrate";

let root: string, oldDir: string, newDir: string;
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "code-reviewer-migrate-"));
  oldDir = path.join(root, "old");
  newDir = path.join(root, "new");
  mkdirSync(path.join(oldDir, "guidelines"), { recursive: true });
  writeFileSync(path.join(oldDir, "state.json"), "old-state");
  writeFileSync(path.join(oldDir, "Local State"), "key");
  writeFileSync(path.join(oldDir, "guidelines", "a.md"), "doc");
  mkdirSync(path.join(oldDir, "Cache"));
  writeFileSync(path.join(oldDir, "Cache", "junk"), "x");
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("migrateUserData", () => {
  it("brings across accounts, the token key and documents, but not caches", () => {
    expect(migrateUserData(oldDir, newDir)).toBe(true);
    expect(readFileSync(path.join(newDir, "state.json"), "utf8")).toBe("old-state");
    expect(readFileSync(path.join(newDir, "Local State"), "utf8")).toBe("key");
    expect(readFileSync(path.join(newDir, "guidelines", "a.md"), "utf8")).toBe("doc");
    expect(existsSync(path.join(newDir, "Cache"))).toBe(false);
  });
  it("works when the new folder already exists but has no data", () => {
    mkdirSync(newDir);
    writeFileSync(path.join(newDir, "Local State"), "new-empty-key");
    expect(migrateUserData(oldDir, newDir)).toBe(true);
    expect(readFileSync(path.join(newDir, "Local State"), "utf8")).toBe("key");
  });
  it("never overwrites data in the new folder", () => {
    mkdirSync(newDir);
    writeFileSync(path.join(newDir, "state.json"), "new-state");
    expect(migrateUserData(oldDir, newDir)).toBe(false);
    expect(readFileSync(path.join(newDir, "state.json"), "utf8")).toBe("new-state");
  });
  it("does nothing on a fresh install", () => {
    expect(migrateUserData(path.join(root, "none"), newDir)).toBe(false);
    expect(existsSync(newDir)).toBe(false);
  });
  it("keeps the old folder", () => {
    migrateUserData(oldDir, newDir);
    expect(existsSync(path.join(oldDir, "state.json"))).toBe(true);
  });
});
