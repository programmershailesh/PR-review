import { describe, expect, it } from "vitest";
import { interpretAuthStatus } from "./auth";
import { subscriptionOnlyEnv } from "./env";
import { findClaude } from "./find";
import { buildArgs, ProgressTracker, resultFromEvent } from "./runner";

const validResult = {
  verdict: "approve",
  summary: "Fine.",
  stack: [],
  dimensions: Object.fromEntries(
    ["architecture", "performance", "security", "correctness", "stack", "requirements"].map((d) => [d, { status: "pass", note: "" }]),
  ),
  requirements: [],
  findings: [],
  rejected: [],
  challengeStats: { raised: 0, rejected: 0, downgraded: 0, kept: 0 },
  coverage: { filesReviewed: 1, filesSkipped: [] },
  praise: [],
};

describe("subscriptionOnlyEnv", () => {
  it("removes everything that could move billing off the subscription", () => {
    const env = subscriptionOnlyEnv({
      PATH: "/bin",
      ANTHROPIC_API_KEY: "x",
      ANTHROPIC_AUTH_TOKEN: "x",
      ANTHROPIC_BASE_URL: "x",
      anthropic_api_key: "x",
      CLAUDE_CODE_USE_BEDROCK: "1",
      CLAUDE_CODE_USE_VERTEX: "1",
    });
    expect(env).toEqual({ PATH: "/bin" });
  });
});

describe("interpretAuthStatus", () => {
  it("accepts a subscription login", () => {
    const s = interpretAuthStatus(JSON.stringify({ loggedIn: true, authMethod: "claude.ai", subscriptionType: "max" }));
    expect(s.ok).toBe(true);
    expect(s.subscriptionType).toBe("max");
  });
  it.each([
    ["signed out", { loggedIn: false }],
    ["API key login", { loggedIn: true, authMethod: "api_key" }],
    ["no subscription", { loggedIn: true, authMethod: "claude.ai" }],
  ])("refuses %s", (_name, body) => {
    expect(interpretAuthStatus(JSON.stringify(body)).ok).toBe(false);
  });
  it("refuses output it cannot read", () => {
    expect(interpretAuthStatus("not json").ok).toBe(false);
  });
});

describe("findClaude", () => {
  const existsIn = (paths: string[]) => (p: string) => paths.includes(p);
  it("prefers the native exe on Windows", () => {
    const found = findClaude({
      platform: "win32",
      env: { PATH: "C:\\tools" },
      home: "C:\\Users\\a",
      exists: existsIn(["C:\\Users\\a\\.local\\bin\\claude.exe"]),
    });
    expect(found).toEqual({ command: "C:\\Users\\a\\.local\\bin\\claude.exe", prefixArgs: [] });
  });
  it("runs the script behind an npm shim instead of using a shell", () => {
    const script = "C:\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js";
    const found = findClaude({ platform: "win32", env: { PATH: "C:\\npm" }, home: "C:\\Users\\a", exists: existsIn(["C:\\npm\\claude.cmd", script]) });
    expect(found).toEqual({ command: "node", prefixArgs: [script] });
  });
  it("finds Homebrew installs when the app starts with a short PATH on macOS", () => {
    const found = findClaude({ platform: "darwin", env: { PATH: "/usr/bin" }, home: "/Users/a", exists: existsIn(["/opt/homebrew/bin/claude"]) });
    expect(found?.command).toBe("/opt/homebrew/bin/claude");
  });
  it("returns nothing when it is not installed", () => {
    expect(findClaude({ platform: "linux", env: { PATH: "/bin" }, home: "/home/a", exists: () => false })).toBeUndefined();
  });
});

describe("buildArgs", () => {
  it("never offers write, shell or network tools", () => {
    const args = buildArgs("/engine", "{}", "thorough");
    const tools = args[args.indexOf("--tools") + 1]!;
    expect(tools).toBe("Read,Grep,Glob,Agent,Skill");
    expect(args).toContain("--strict-mcp-config");
  });
  it("keeps the user's own plugins and hooks out of reviews", () => {
    const args = buildArgs("/engine", "{}", "thorough");
    expect(args[args.indexOf("--setting-sources") + 1]).toBe("project");
  });
  it("passes quick mode to the skill", () => {
    expect(buildArgs("/engine", "{}", "quick")[1]).toBe("/code-reviewer:review-pr quick");
  });
});

describe("ProgressTracker", () => {
  const call = (id: string, agent: string) => ({
    type: "assistant",
    message: { content: [{ type: "tool_use", id, name: "Agent", input: { subagent_type: `code-reviewer:${agent}` } }] },
  });
  const done = (id: string) => ({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id }] } });

  it("moves through the stages as agents run", () => {
    const t = new ProgressTracker();
    expect(t.progress.stage).toBe("reading");
    t.update(call("1", "security-reviewer"));
    t.update(call("2", "stack-reviewer"));
    expect(t.progress).toEqual({ stage: "checking", specialistsStarted: 2, specialistsDone: 0 });
    t.update(done("1"));
    expect(t.progress.specialistsDone).toBe(1);
    t.update(call("3", "challenger"));
    expect(t.progress.stage).toBe("challenging");
    t.update(done("3"));
    expect(t.progress.stage).toBe("writing");
  });
  it("ignores events it does not recognise", () => {
    const t = new ProgressTracker();
    expect(t.update({ type: "system" })).toBe(false);
    expect(t.update(null)).toBe(false);
  });
});

describe("resultFromEvent", () => {
  it("reads structured output", () => {
    expect(resultFromEvent({ type: "result", subtype: "success", structured_output: validResult }).verdict).toBe("approve");
  });
  it("falls back to a review returned as fenced text", () => {
    const result = "```json\n" + JSON.stringify(validResult) + "\n```";
    expect(resultFromEvent({ type: "result", subtype: "success", result }).verdict).toBe("approve");
  });
  it("explains an unreadable answer", () => {
    expect(() => resultFromEvent({ type: "result", subtype: "success", result: "All good!" })).toThrow(/readable review/);
  });
  it("explains usage limits plainly", () => {
    expect(() => resultFromEvent({ type: "result", is_error: true, result: "Claude usage limit reached" })).toThrow(/usage limit/);
  });
  it("rejects malformed reviews", () => {
    expect(() => resultFromEvent({ type: "result", structured_output: { verdict: "lgtm" } })).toThrow();
  });
});
