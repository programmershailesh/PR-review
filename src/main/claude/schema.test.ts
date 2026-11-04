import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const schema = JSON.parse(readFileSync(path.join(process.cwd(), "review-engine/schemas/review-result.schema.json"), "utf8")) as Record<string, unknown>;

describe("review result schema", () => {
  it("has no $schema line, which the CLI's validator rejects", () => {
    expect(schema.$schema).toBeUndefined();
  });
  it("lets the lead agent return structured output, but not write or run anything", () => {
    const agent = readFileSync(path.join(process.cwd(), "review-engine/agents/cto-reviewer.md"), "utf8");
    const tools = /^tools: (.*)$/m.exec(agent)?.[1]?.split(", ").map((t) => t.trim());
    expect(tools).toEqual(["Read", "Grep", "Glob", "Agent", "Skill", "StructuredOutput"]);
  });
  it("requires every top-level field the UI reads", () => {
    expect(schema.required).toEqual(expect.arrayContaining(["verdict", "summary", "findings", "guidelinesUsed", "challengeStats"]));
  });
});
