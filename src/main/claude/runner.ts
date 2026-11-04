import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReviewResult, RunProgress } from "../../shared/types";
import { subscriptionOnlyEnv } from "./env";
import type { ClaudeCommand } from "./find";
import { parseReviewResult } from "./result";

const TOOLS = "Read,Grep,Glob,Agent,Skill";
const SPECIALISTS = new Set([
  "architecture-reviewer",
  "performance-reviewer",
  "security-reviewer",
  "correctness-reviewer",
  "stack-reviewer",
  "requirements-reviewer",
]);
const TIMEOUT_MS = 45 * 60 * 1000;

export function buildArgs(enginePath: string, schema: string, depth: "quick" | "thorough", model?: string): string[] {
  const prompt = depth === "quick" ? "/code-reviewer:review-pr quick" : "/code-reviewer:review-pr";
  const args = [
    "-p",
    prompt,
    "--plugin-dir",
    enginePath,
    // The stack references live in the engine folder, outside the working directory.
    "--add-dir",
    enginePath,
    "--agent",
    "code-reviewer:cto-reviewer",
    "--tools",
    TOOLS,
    "--allowedTools",
    TOOLS,
    "--permission-mode",
    "dontAsk",
    "--json-schema",
    schema,
    "--output-format",
    "stream-json",
    "--verbose",
    "--strict-mcp-config",
    "--no-session-persistence",
    // Keeps the user's own plugins and hooks out of reviews. The bundle has no project
    // settings, so this loads no settings at all, and the login still works.
    "--setting-sources",
    "project",
  ];
  if (model) args.push("--model", model);
  return args;
}

/** Turns stream-json events into plain progress. Unknown events are ignored. */
export class ProgressTracker {
  private readonly specialistCalls = new Set<string>();
  private readonly finishedCalls = new Set<string>();
  private challengerCall?: string;
  progress: RunProgress = { stage: "reading", specialistsStarted: 0, specialistsDone: 0 };

  /** Returns true when the progress changed. */
  update(event: unknown): boolean {
    const before = JSON.stringify(this.progress);
    const e = event as { type?: string; message?: { content?: unknown } };
    const content = Array.isArray(e?.message?.content) ? (e.message.content as Record<string, unknown>[]) : [];
    for (const block of content) {
      if (e.type === "assistant" && block.type === "tool_use" && (block.name === "Agent" || block.name === "Task")) {
        const input = block.input as { subagent_type?: string } | undefined;
        const agent = (input?.subagent_type ?? "").split(":").pop() ?? "";
        if (SPECIALISTS.has(agent)) this.specialistCalls.add(String(block.id));
        if (agent === "challenger") this.challengerCall = String(block.id);
      }
      if (e.type === "user" && block.type === "tool_result") this.finishedCalls.add(String(block.tool_use_id));
    }
    const done = [...this.specialistCalls].filter((id) => this.finishedCalls.has(id)).length;
    let stage = this.progress.stage;
    if (this.specialistCalls.size > 0) stage = "checking";
    if (this.challengerCall) {
      stage = this.finishedCalls.has(this.challengerCall) ? "writing" : "challenging";
    }
    this.progress = { stage, specialistsStarted: this.specialistCalls.size, specialistsDone: done };
    return JSON.stringify(this.progress) !== before;
  }
}

/** Pulls the validated review out of the final stream-json result event. */
export function resultFromEvent(event: Record<string, unknown>): ReviewResult {
  if (event.is_error === true || (event.subtype && event.subtype !== "success")) {
    const text = typeof event.result === "string" ? event.result : String(event.subtype ?? "unknown error");
    throw new Error(friendlyCliError(text));
  }
  if (event.structured_output !== undefined) return parseReviewResult(event.structured_output);
  if (typeof event.result === "string") {
    // Fallback for a review returned as text, which may be wrapped in a code fence.
    const text = event.result.trim();
    const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```$/.exec(text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(fenced?.[1] ?? text);
    } catch {
      throw new Error("Claude Code finished, but its answer wasn't a readable review. Try reviewing again.");
    }
    return parseReviewResult(parsed);
  }
  throw new Error("Claude Code finished without returning a review.");
}

function friendlyCliError(text: string): string {
  if (/usage limit|rate limit|limit reached|hit your/i.test(text)) {
    return "Your Claude usage limit has been reached. Try this review again after it resets.";
  }
  if (/not logged in|please run \/login|authentication/i.test(text)) {
    return "Claude Code isn't signed in. Run `claude auth login` in a terminal, then try again.";
  }
  return `Claude Code stopped with an error: ${text.slice(0, 400)}`;
}

export interface RunOptions {
  claude: ClaudeCommand;
  bundleDir: string;
  enginePath: string;
  depth: "quick" | "thorough";
  model?: string;
  signal?: AbortSignal;
  onProgress?: (progress: RunProgress) => void;
  onEvent?: (event: unknown) => void;
}

export async function runReview(options: RunOptions): Promise<ReviewResult> {
  const schema = await readFile(path.join(options.enginePath, "schemas", "review-result.schema.json"), "utf8");
  const args = [
    ...options.claude.prefixArgs,
    ...buildArgs(options.enginePath, JSON.stringify(JSON.parse(schema)), options.depth, options.model),
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(options.claude.command, args, {
      cwd: options.bundleDir,
      env: subscriptionOnlyEnv(process.env),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const tracker = new ProgressTracker();
    let buffer = "";
    let stderr = "";
    let final: Record<string, unknown> | undefined;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      fn();
    };
    const onAbort = () => {
      child.kill();
      finish(() => reject(new Error("cancelled")));
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(() => reject(new Error("The review took too long and was stopped.")));
    }, TIMEOUT_MS);
    if (options.signal?.aborted) onAbort();
    options.signal?.addEventListener("abort", onAbort);

    const handleLine = (line: string) => {
      if (!line.trim()) return;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line) as Record<string, unknown>;
      } catch {
        return;
      }
      options.onEvent?.(event);
      if (event.type === "result") final = event;
      if (tracker.update(event)) options.onProgress?.(tracker.progress);
    };

    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      lines.forEach(handleLine);
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-2000);
    });
    child.on("error", (err) => finish(() => reject(new Error(`Couldn't start Claude Code: ${err.message}`))));
    child.on("close", (code) => {
      handleLine(buffer);
      finish(() => {
        try {
          if (final) resolve(resultFromEvent(final));
          else reject(new Error(friendlyCliError(stderr.trim() || `exit code ${code}`)));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    });
  });
}
