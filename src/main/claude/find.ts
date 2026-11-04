import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export interface ClaudeCommand {
  command: string;
  /** Arguments that must come before any others, used when launching through node. */
  prefixArgs: string[];
}

export interface FindOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  home?: string;
  exists?: (p: string) => boolean;
}

/**
 * Finds the claude CLI. Desktop apps often start with a much shorter PATH than a
 * terminal, especially on macOS, so the usual install locations are checked as well.
 */
export function findClaude(options: FindOptions = {}): ClaudeCommand | undefined {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const home = options.home ?? homedir();
  const exists = options.exists ?? existsSync;
  const p = platform === "win32" ? path.win32 : path.posix;

  const pathValue = env.PATH ?? env.Path ?? "";
  const dirs = pathValue.split(platform === "win32" ? ";" : ":").filter(Boolean);
  dirs.push(p.join(home, ".local", "bin"), p.join(home, ".claude", "local"));
  if (platform === "win32") {
    if (env.APPDATA) dirs.push(p.join(env.APPDATA, "npm"));
  } else {
    dirs.push("/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", p.join(home, ".npm-global", "bin"));
  }

  if (platform !== "win32") {
    for (const dir of dirs) {
      const candidate = p.join(dir, "claude");
      if (exists(candidate)) return { command: candidate, prefixArgs: [] };
    }
    return undefined;
  }

  for (const dir of dirs) {
    const candidate = p.join(dir, "claude.exe");
    if (exists(candidate)) return { command: candidate, prefixArgs: [] };
  }
  // An npm install only gives a .cmd shim, which cannot start without a shell.
  // Run the script behind the shim instead, so no shell string is ever involved.
  for (const dir of dirs) {
    if (!exists(p.join(dir, "claude.cmd"))) continue;
    const script = p.join(dir, "node_modules", "@anthropic-ai", "claude-code", "cli.js");
    if (exists(script)) {
      const bundledNode = p.join(dir, "node.exe");
      return { command: exists(bundledNode) ? bundledNode : "node", prefixArgs: [script] };
    }
  }
  return undefined;
}
