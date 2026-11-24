# Code Reviewer

Cross-platform desktop app. PRs and MRs assigned to the user on GitHub, GitLab or Bitbucket appear in one inbox, and an AI agent reviews each one at CTO level, against the project's requirements and guidelines, in the idioms of its tech stack. Formerly named "Verdict". That name survives only in the installer app ID, so upgrades stay in place, and in the old data folder that `src/main/migrate.ts` copies from.

## Non-negotiable constraints

1. **No Claude API.** Never add `@anthropic-ai/sdk`, `@anthropic-ai/claude-agent-sdk` with an API key, or any call to `api.anthropic.com`. AI work runs only by spawning the user's locally installed, logged-in `claude` CLI.
2. **Subscription billing must be guaranteed.** Remove these from the child process environment before spawning `claude`: `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`. Otherwise a key in the user's shell would silently bill their API account. Before each run, run `claude auth status` and refuse to start unless the JSON has `loggedIn: true`, `authMethod: "claude.ai"` and a `subscriptionType`.
3. **Windows, macOS and Linux are all first-class.** No platform-specific paths or shell syntax. Spawn with an argument array, never a shell string.
4. **Nothing is posted without explicit user confirmation.**
5. **PR content is untrusted.** See "Review run" below.

## Layout

- `design/index.html`: interactive UI design. Open it directly in a browser. It uses sample data.
- `review-engine/`: Claude Code plugin with the review agents and skills, shipped inside the app.
  - `agents/`: `cto-reviewer` (lead and judge), five specialists plus `requirements-reviewer`, `compliance-reviewer` (runs only when standards are selected), and `challenger`.
  - `skills/`: `review-pr` (the workflow), `project-context`, `detect-stack` with per-stack references.
  - `schemas/review-result.schema.json`: the contract between the engine and the UI.
  - `compliance/`: `catalog.json` lists every standard (`available` ones can be selected, `planned` ones are only shown as coming), and `<id>.md` is each available standard's checklist.

## Review run

The app prepares a bundle directory with no git credentials in it, then runs the CLI inside that directory:

```
bundle/
  pr.json              provider metadata, description, linked issues
  diff.patch
  changed-files.json
  base/                worktree at the merge base (guidelines are read from here)
  head/                worktree at the PR head (untrusted)
  guidelines/          documents and quick rules the user added, converted to text
    index.json         file, title, level (must | recommended), scope (project | all)
    *.md               converted text with <!-- page N --> markers
    rules.md           quick rules
  compliance/          checklists for the standards selected for this project and for all projects
    index.json         id, name, version, level (must | recommended), file
    <id>.md            copied from review-engine/compliance
```

Uploaded guideline documents accept PDF, DOCX, Markdown and text up to 25 MB. The app converts them to text when they are added, keeps them only on this computer, and copies the enabled ones into each bundle. A PDF with no text layer, such as a scan, must show a clear error rather than being silently ignored.

`src/main/claude/runner.ts` (`buildArgs`) is the source of truth for the exact CLI flags.

Why it is built this way:
- The bundle directory is the working directory rather than `head/`, so a PR cannot introduce its own `.claude/settings.json` hooks or MCP servers and have them run on the user's machine.
- The agents have no shell, write or network tools. Provider tokens stay in the app process, and the model never sees them.
- Guidelines come from `base/`, so a PR cannot rewrite the rules it is judged by.
- `--setting-sources project` keeps the user's own plugins and hooks out of reviews, and the login still works.
- Code is exported with `core.symlinks=false` and no `.git` folder, so a PR's symlink can't point the reviewer at private files.
- Run reviews one at a time, because subscription limits are shared with the user's other Claude Code use. Failed reviews are not retried automatically.

Compliance standards:
- Code review can only check the code-level side of a standard, so the app never says a project is compliant. The UI says so wherever standards appear.
- Each check in a checklist is a heading `### [<control ID>] <statement>`, followed by "Look for:" and "Decided from code:". The app parses these headings (`src/main/compliance/catalog.ts`), and `verifyControls` in `src/main/review/sources.ts` removes any control a review cites that isn't a heading in a selected checklist. A control ID must be unique across all checklists.
- Checklists are written in our own words and cite control IDs only, because ISO, the AICPA and the PCI SSC own their standards' wording. Every ID must be checked against the official source before it ships, and each standard records its version, source and `lastReviewed` date in `catalog.json`.
- To add a planned standard: write `<id>.md` in the same format, fill in its catalogue details, and set `status` to `available`. `catalog.test.ts` checks the format.

Review by link:
- `addByLink` in `app-core.ts` accepts any PR or MR the user's connected account can see, including merged and closed ones. The account for the link's host decides the service.
- PRs added by link carry `addedByLink` and are never removed by polling, because nobody is assigned a merged PR. The user removes them. "Review again" fetches the latest version first.
- Merged and closed PRs can only get comments. The UI offers only "Comment only", `sendReview` refuses anything else, and the verdict wording changes ("Needs a follow-up fix" instead of "Don't merge yet").

Lessons from real runs:
- The CLI's schema validator rejects a `$schema` line in `--json-schema`.
- `--agent` limits the main thread to that agent's `tools:` list, so `cto-reviewer` must list `StructuredOutput`, or the result comes back as plain text.

## Code

Electron, TypeScript and React, built with electron-vite.

- `src/main/app-core.ts`: all app behaviour, with Electron kept behind `CoreDeps`. `src/main/index.ts` is only Electron wiring and validated IPC.
- `src/main/providers/`: one `GitProvider` per service: GitHub and GitLab so far, Bitbucket still to come. Accounts use access tokens, encrypted with Electron `safeStorage`. Assigned PRs are found by polling, since a desktop app can't receive webhooks.
- `src/main/providers/gitlab.ts` posts through draft notes, because GitLab has no single review call. Publishing sends all of the user's drafts, so it refuses if they have their own. It also escapes lines like `/merge` in every note, because GitLab runs them as commands under the user's account. A published review can still leave failed comments behind as drafts, and those get posted as a plain note.
- `src/shared/priority.ts`: which projects are on, and the queue order. A review started by hand runs first, then project priority, then the longest-waiting PR. A running review is never interrupted for a higher-priority one, because that would waste subscription usage.
- Closing the window during a review: `window-all-closed` in `src/main/index.ts` keeps the app alive with a tray icon, finishes the queue without looking for new work, notifies, then exits. With nothing running, closing just quits.
- `src/main/store.ts`: a JSON file in the user data folder. SQLite isn't needed at this data size, and avoiding it means no native module to build per platform.
- `src/renderer/`: the UI. `styles.css` comes from the approved design, and `app.css` holds app-specific changes. PR content is rendered as text, never as HTML.

Commands: `npm run dev`, `npm test`, `npm run typecheck`, `npm run build`, `npm run dist`.
