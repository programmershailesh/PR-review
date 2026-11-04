/**
 * Claude Code prefers an API key or a third-party provider over the subscription
 * login when these are set. Removing them guarantees reviews never bill an API account.
 */
const BLOCKED_PREFIXES = ["ANTHROPIC_"];
const BLOCKED_NAMES = new Set([
  "CLAUDE_CODE_USE_BEDROCK",
  "CLAUDE_CODE_USE_VERTEX",
  "CLAUDE_CODE_USE_FOUNDRY",
  "AWS_BEARER_TOKEN_BEDROCK",
]);

export function subscriptionOnlyEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const clean: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(env)) {
    // Windows environment names are case-insensitive.
    const upper = name.toUpperCase();
    if (BLOCKED_NAMES.has(upper) || BLOCKED_PREFIXES.some((p) => upper.startsWith(p))) continue;
    clean[name] = value;
  }
  return clean;
}
