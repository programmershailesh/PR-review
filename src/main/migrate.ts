import { cpSync, existsSync } from "node:fs";
import path from "node:path";

/** "Local State" holds the key that decrypts saved tokens, so it must move with state.json. */
const KEEP = ["state.json", "Local State", "guidelines", "diffs", "repos"];

/**
 * The data folder is named after the app, so a rename would otherwise lose accounts and
 * reviews. Copies only what matters, and leaves the old folder in place in case of trouble.
 * Returns true if data was copied.
 */
export function migrateUserData(oldDir: string, newDir: string): boolean {
  if (!existsSync(path.join(oldDir, "state.json"))) return false;
  if (existsSync(path.join(newDir, "state.json"))) return false;
  for (const name of KEEP) {
    const from = path.join(oldDir, name);
    if (existsSync(from)) cpSync(from, path.join(newDir, name), { recursive: true });
  }
  return true;
}
