import { execFile } from "node:child_process";
import type { ClaudeStatus } from "../../shared/types";
import { subscriptionOnlyEnv } from "./env";
import { findClaude, type ClaudeCommand } from "./find";

const NOT_INSTALLED =
  "Claude Code isn't installed, or Code Reviewer can't find it. Install it from claude.com/claude-code, then check again.";
const NOT_SIGNED_IN = "Claude Code isn't signed in. Run `claude auth login` in a terminal, then check again.";
const NOT_SUBSCRIPTION =
  "Claude Code isn't using a Claude subscription, and Code Reviewer only runs on a subscription. Run `claude auth login` in a terminal and sign in with your Claude account.";

/** Decides from `claude auth status` output whether reviews may run. Fails closed. */
export function interpretAuthStatus(raw: string, version?: string): ClaudeStatus {
  let parsed: { loggedIn?: unknown; authMethod?: unknown; subscriptionType?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, found: true, version, message: NOT_SIGNED_IN };
  }
  if (parsed.loggedIn !== true) return { ok: false, found: true, version, message: NOT_SIGNED_IN };
  if (parsed.authMethod !== "claude.ai" || typeof parsed.subscriptionType !== "string" || !parsed.subscriptionType) {
    return { ok: false, found: true, version, message: NOT_SUBSCRIPTION };
  }
  return { ok: true, found: true, version, subscriptionType: parsed.subscriptionType };
}

function run(cmd: ClaudeCommand, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd.command,
      [...cmd.prefixArgs, ...args],
      { env: subscriptionOnlyEnv(process.env), timeout: 30_000, windowsHide: true, encoding: "utf8" },
      (err, stdout) => {
        // `auth status` exits non-zero when signed out but still prints its JSON.
        if (err && !stdout) reject(err);
        else resolve(stdout);
      },
    );
  });
}

export async function checkClaude(): Promise<ClaudeStatus> {
  const cmd = findClaude();
  if (!cmd) return { ok: false, found: false, message: NOT_INSTALLED };
  let version: string | undefined;
  try {
    version = (await run(cmd, ["--version"])).trim().split(/\s/)[0];
  } catch {
    return { ok: false, found: false, message: NOT_INSTALLED };
  }
  try {
    return interpretAuthStatus(await run(cmd, ["auth", "status"]), version);
  } catch {
    return { ok: false, found: true, version, message: NOT_SIGNED_IN };
  }
}
