import { useEffect, useMemo, useState } from "react";
import { parseDiff, type DiffFile } from "../../../shared/diff";
import { projectEnabled } from "../../../shared/priority";
import { PROVIDER_NAME, type ComplianceStandard, type Dimension, type DimensionStatus, type Finding, type PullRequest, type RequirementStatus, type ReviewRecord, type ReviewResult, type RunProgress, type SendEvent } from "../../../shared/types";
import type { Ctx } from "../App";
import { ClaudeBanner } from "./Reviews";
import { COMPLIANCE_STATUS, Dialog, Highlight, IconAsk, IconCheck, IconChevron, IconCross, IconDoc, IconShield, IconWarn, SEV, Switch, TONE, VerdictIcon, api, errorText, isFinished, plural, prNumber, shortRepo, timeAgo, unitName, verdictWord } from "../ui";

const AREA: Record<Dimension, [string, string]> = {
  architecture: ["Architecture", "Design and how it holds up as you grow"],
  performance: ["Performance", "Speed and resource use under load"],
  security: ["Security", "Ways someone could abuse it"],
  correctness: ["Correctness", "Bugs and edge cases"],
  stack: ["Tech stack", "Best practice for the tools this project uses"],
  requirements: ["Requirements", "Matches the ticket and your project rules"],
};
const AREA_RESULT: Record<DimensionStatus, [string, string]> = {
  pass: ["Looks good", "c-green"],
  watch: ["Has issues", "c-amber"],
  block: ["Serious problem", "c-red"],
  not_applicable: ["Not checked", "c-muted"],
};
const SEND: Record<SendEvent, [string, string]> = {
  request_changes: ["Request changes", "Blocks merging until the issues are fixed."],
  comment: ["Comment only", "Shares your feedback without blocking or approving."],
  approve: ["Approve", "Allows merging. Your comments are still included."],
};
const MAX_DIFF_LINES = 4000;

type Tab = "issues" | "reqs" | "code" | "checked";

export function ReviewView({ ctx, prKey }: { ctx: Ctx; prKey: string }) {
  const { state, go, attempt, toast } = ctx;
  const pr = state.prs.find((p) => p.key === prKey) as PullRequest;
  const review = state.reviews[prKey];
  const result = review?.result;
  const [tab, setTab] = useState<Tab>("issues");
  const [open, setOpen] = useState<number | null>(0);
  const [sending, setSending] = useState(false);
  const [diffText, setDiffText] = useState("");

  const finished = review?.state === "ready" || review?.state === "sent";
  const finishedAt = review?.finishedAt;
  useEffect(() => {
    if (!finished) return;
    let live = true;
    void api().getDiff(prKey).then((d) => live && setDiffText(d));
    return () => {
      live = false;
    };
  }, [prKey, finished, finishedAt]);
  const diff = useMemo(() => parseDiff(diffText), [diffText]);

  const included = (i: number) => review?.drafts[i]?.included !== false;
  const setInclude = (i: number, v: boolean) => attempt(() => api().updateDraft(prKey, i, { ...review?.drafts[i], included: v }));

  // Shortcuts only apply on the Issues tab of a finished review.
  useEffect(() => {
    if (!finished || !result) return;
    const count = result.findings.length;
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("dialog[open]") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement).tagName)) return;
      const k = e.key.toLowerCase();
      if ((k === "j" || k === "k") && count) {
        setTab("issues");
        setOpen((o) => ((o ?? (k === "j" ? -1 : 0)) + (k === "j" ? 1 : -1) + count) % count);
      } else if (k === "x" && open !== null && review?.state === "ready" && count) {
        setInclude(open, !included(open));
      } else if (k === "s" && review?.state === "ready") {
        setSending(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, result, open, review?.drafts, review?.state]);

  const header = (
    <>
      <button className="back" onClick={() => go({ view: "reviews" })}>← Reviews</button>
      <h1 className="rv-title">{pr.title}</h1>
      <div className="rv-meta">
        <span>{shortRepo(pr.repo)} {prNumber(pr)}</span>
        {isFinished(pr) && <span className="tag">{pr.status === "merged" ? "Merged" : "Closed"}</span>}
        <span>{pr.author}</span>
        <span>{timeAgo(pr.updatedAt)}</span>
        <span className="rv-links">
          <button className="link" onClick={() => attempt(() => api().openExternal(pr.url))}>Open on {PROVIDER_NAME[pr.provider]}</button>
          {review?.state !== "running" && review?.state !== "queued" && (
            <button className="link" onClick={() => attempt(() => api().startReview(prKey))}>{finished ? "Review again" : "Start review"}</button>
          )}
          {pr.addedByLink && (
            <button
              className="link"
              onClick={() => attempt(async () => {
                await api().removeLinked(prKey);
                go({ view: "reviews" });
                toast("Removed from your list.");
              })}
            >
              Remove from list
            </button>
          )}
        </span>
      </div>
    </>
  );

  if (!finished || !result) {
    return (
      <div className="scroll">
        <div className="col">
          {header}
          <ClaudeBanner ctx={ctx} />
          <RunPanel ctx={ctx} pr={pr} review={review} />
        </div>
      </div>
    );
  }

  const tone = TONE[result.verdict];
  const kept = result.findings.filter((_, i) => included(i)).length;
  const tabs: [Tab, string][] = [["issues", `Issues (${result.findings.length})`], ["reqs", "Requirements"], ["code", "Code changes"], ["checked", "How it was checked"]];
  const rejectedCount = result.challengeStats.rejected;

  return (
    <>
      <div className="scroll">
        <div className="col">
          {header}
          <section className="answer" style={{ ["--tone" as string]: `var(--${tone})`, ["--tone-soft" as string]: `var(--${tone}-soft)` }}>
            <div className="answer-word"><VerdictIcon verdict={result.verdict} s={20} />{verdictWord(result.verdict, pr)}</div>
            <p>{result.summary}</p>
            <ComplianceLine result={result} catalog={ctx.catalog} onDetails={() => setTab("checked")} />
            {review.state === "sent" && review.sentAs ? (
              <small>You sent this review to {PROVIDER_NAME[pr.provider]} as “{SEND[review.sentAs][0]}”.</small>
            ) : (
              <small>
                {plural(result.findings.length, "issue")} confirmed. {plural(rejectedCount, "false alarm")} removed before you saw {rejectedCount === 1 ? "it" : "them"}.{" "}
                <button className="link" style={{ fontSize: "inherit" }} onClick={() => setTab("checked")}>See how it was checked</button>
              </small>
            )}
          </section>
          <div className="tabs" role="tablist">
            {tabs.map(([k, label]) => (
              <button key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>
          <div className="tab-body">
            {tab === "issues" && <IssuesTab pr={pr} review={review} result={result} diff={diff} open={open} setOpen={setOpen} ctx={ctx} setInclude={setInclude} />}
            {tab === "reqs" && <RequirementsTab ctx={ctx} pr={pr} result={result} />}
            {tab === "code" && <CodeTab result={result} diff={diff} service={PROVIDER_NAME[pr.provider]} onJump={(i) => { setTab("issues"); setOpen(i); }} />}
            {tab === "checked" && <CheckedTab result={result} catalog={ctx.catalog} />}
          </div>
        </div>
      </div>
      {review.state === "ready" && (
        <div className="send-bar">
          <span>{kept ? `${plural(kept, "comment")} will be sent on this ${unitName(pr)}.` : "Nothing is sent until you choose."}</span>
          <button className="btn primary" onClick={() => setSending(true)}>Send review…</button>
        </div>
      )}
      {sending && (
        <SendDialog
          pr={pr}
          result={result}
          kept={kept}
          onClose={() => setSending(false)}
          onSent={() => {
            setSending(false);
            const next = state.prs.find((p) => p.key !== prKey && state.reviews[p.key]?.state === "ready");
            toast(`Review sent to ${PROVIDER_NAME[pr.provider]}.`, next ? { label: "Next review", run: () => go({ view: "review", prKey: next.key }) } : undefined);
          }}
        />
      )}
    </>
  );
}

function RunPanel({ ctx, pr, review }: { ctx: Ctx; pr: PullRequest; review?: ReviewRecord }) {
  const { attempt } = ctx;
  const neutral = { ["--tone" as string]: "var(--text-2)", ["--tone-soft" as string]: "var(--card-2)" };
  if (!review && !projectEnabled(pr.repo, ctx.state.projects, ctx.state.settings.reviewNewProjects)) {
    return (
      <section className="answer" style={neutral}>
        <div className="answer-word">This project is turned off</div>
        <p>Changes from {shortRepo(pr.repo)} aren't reviewed automatically. You can review just this one, or turn the project on.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn small" onClick={() => attempt(() => api().startReview(pr.key))}>Review this one</button>
          <button className="btn small" onClick={() => attempt(() => api().setProjectEnabled(pr.repo, true))}>Turn on project</button>
        </div>
      </section>
    );
  }
  if (!review) {
    return (
      <section className="answer" style={neutral}>
        <div className="answer-word">Not reviewed yet</div>
        <p>Automatic reviews are off, so this one is waiting for you.</p>
        <button className="btn small" style={{ marginTop: 12 }} onClick={() => attempt(() => api().startReview(pr.key))}>Start review</button>
      </section>
    );
  }
  if (review.state === "failed") {
    return (
      <section className="answer" style={{ ["--tone" as string]: "var(--red)", ["--tone-soft" as string]: "var(--red-soft)" }}>
        <div className="answer-word"><IconCross s={20} />Couldn't finish this review</div>
        <p style={{ overflowWrap: "anywhere" }}>{review.error}</p>
        <button className="btn small" style={{ marginTop: 12 }} onClick={() => attempt(() => api().startReview(pr.key))}>Try again</button>
      </section>
    );
  }
  if (review.state === "queued") {
    return (
      <section className="answer" style={neutral}>
        <div className="answer-word">Up next</div>
        <p>Reviews run one at a time to protect your Claude usage limits, in your project priority order.</p>
        <button className="btn small" style={{ marginTop: 12 }} onClick={() => attempt(() => api().cancelReview(pr.key))}>Cancel</button>
      </section>
    );
  }
  return <Progress progress={review.progress} onCancel={() => attempt(() => api().cancelReview(pr.key))} />;
}

function Progress({ progress, onCancel }: { progress?: RunProgress; onCancel: () => void }) {
  const stage = progress?.stage ?? "preparing";
  const order = ["preparing", "reading", "checking", "challenging", "writing"];
  const at = order.indexOf(stage);
  const steps: [string, string][] = [
    ["Getting the code", "Downloading just the two versions this change compares."],
    ["Reading the change", "Finding the requirements and project rules, and detecting the tech stack."],
    ["Checking the code", `${progress?.specialistsDone ?? 0} of ${progress?.specialistsStarted || "the"} specialists finished.`],
    ["Double-checking the findings", "A separate reviewer tries to prove each finding wrong, so you only see real ones."],
    ["Writing the verdict", "The lead reviewer makes the final call."],
  ];
  return (
    <>
      <section className="answer" style={{ ["--tone" as string]: "var(--accent)", ["--tone-soft" as string]: "var(--accent-soft)" }}>
        <div className="answer-word">Reviewing…</div>
        <p>You can close this window. The review keeps running, and you'll be notified when it's ready.</p>
        <button className="btn small" style={{ marginTop: 12 }} onClick={onCancel}>Cancel</button>
      </section>
      <div className="steps">
        {steps.map(([title, sub], i) => (
          <div key={title} className={`step ${i < at ? "done" : i === at ? "now" : ""}`}>
            <span className="step-i">{i < at && <IconCheck s={12} />}</span>
            <div><b>{title}</b>{i === at && <small>{sub}</small>}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function Snippet({ finding, diff }: { finding: Finding; diff: DiffFile[] }) {
  const file = diff.find((f) => f.path === finding.file);
  const lines = (file?.hunks ?? [])
    .flatMap((h) => h.lines)
    .filter((l) => l.newLine !== undefined && l.newLine >= finding.line - 1 && l.newLine <= finding.line + 2);
  // Blank lines around the flagged line add nothing, but the flagged line itself always stays.
  while (lines.length && !lines[lines.length - 1]!.text.trim() && lines[lines.length - 1]!.newLine !== finding.line) lines.pop();
  while (lines.length && !lines[0]!.text.trim() && lines[0]!.newLine !== finding.line) lines.shift();
  return (
    <>
      <div className="issue-file">{finding.file}, line {finding.line}</div>
      {lines.length > 0 && (
        <pre className="code">
          {lines.map((l) => (
            <span key={l.newLine} className={`ln ${l.newLine === finding.line ? "hit" : ""}`}><Highlight text={l.text} /></span>
          ))}
        </pre>
      )}
    </>
  );
}

const defaultComment = (f: Finding) => `${f.problem}\n\n${f.impact}\n\n${f.betterApproach}`;

function IssuesTab({ pr, review, result, diff, open, setOpen, ctx, setInclude }: {
  pr: PullRequest; review: ReviewRecord; result: ReviewResult; diff: DiffFile[]; open: number | null; setOpen: (i: number | null) => void; ctx: Ctx; setInclude: (i: number, v: boolean) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [text, setText] = useState("");
  const docNames = ctx.state.docs.map((d) => d.name);

  if (!result.findings.length) {
    return (
      <div className="empty">
        <b>No issues worth mentioning</b>
        {plural(result.challengeStats.raised, "possible issue")} checked and ruled out.
        {result.praise.map((p) => <p className="praise" key={p}>{p}</p>)}
      </div>
    );
  }
  return (
    <>
      {result.findings.map((f, i) => {
        const isOpen = open === i;
        const off = review.drafts[i]?.included === false;
        const edited = review.drafts[i]?.text;
        const fromDoc = f.ruleSource ? docNames.some((n) => f.ruleSource?.includes(n)) : false;
        return (
          <article key={i} className={`issue ${isOpen ? "open" : ""} ${off ? "off" : ""}`}>
            <button className="issue-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
              <span className={`sev s-${f.severity}`}>{SEV[f.severity]}</span>
              <span className="issue-title">{f.title}</span>
              <IconChevron />
            </button>
            {isOpen && (
              <div className="issue-body">
                <h4>What's wrong</h4>
                <p>{f.problem}</p>
                <Snippet finding={f} diff={diff} />
                <h4>What could happen</h4>
                <p>{f.impact}</p>
                <div className="better-box">
                  <h4>A better way</h4>
                  <p>{f.betterApproach}</p>
                  {f.suggestedCode && (
                    <>
                      <pre className="code">{f.suggestedCode.split("\n").map((l, n) => <span className="ln" key={n}><Highlight text={l} /></span>)}</pre>
                      <button
                        className="link"
                        style={{ marginTop: 8 }}
                        onClick={() => ctx.attempt(async () => {
                          await navigator.clipboard.writeText(f.suggestedCode ?? "");
                          ctx.toast("Code copied.");
                        })}
                      >
                        Copy code
                      </button>
                    </>
                  )}
                </div>
                {f.ruleSource && <div className="source"><IconDoc s={14} /><span>{fromDoc ? "From your document: " : "Based on: "}{f.ruleSource}</span></div>}
                {f.controls?.length ? <div className="source"><IconShield s={14} /><span>Breaks {f.controls.map((c) => <span className="ctl" key={c}>{c}</span>)}</span></div> : null}
                <div className="source"><IconCheck s={14} /><span>{f.challenge.note}</span></div>
                {editing === i ? (
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      ctx.attempt(() => api().updateDraft(pr.key, i, { included: !off, text: text.trim() || undefined }));
                      setEditing(null);
                    }}
                  >
                    <label className="field" style={{ margin: 0 }}>
                      Your comment
                      <textarea className="input" rows={5} autoFocus value={text} onChange={(e) => setText(e.target.value)} />
                    </label>
                    <div className="acts">
                      <button className="btn small primary">Save</button>
                      <button type="button" className="btn small" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  edited && <div className="qa"><b>Your edited comment</b><span style={{ whiteSpace: "pre-wrap" }}>{edited}</span></div>
                )}
                {review.state === "ready" && (
                  <div className="issue-foot">
                    <span className="toggle"><Switch on={!off} label="Include in my review" onChange={(v) => setInclude(i, v)} />Include in my review</span>
                    <span className="right">
                      <button
                        className="link"
                        onClick={() => {
                          setText(edited ?? defaultComment(f));
                          setEditing(i);
                        }}
                      >
                        Edit comment
                      </button>
                    </span>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </>
  );
}

const REQ_STATUS: Record<RequirementStatus, { icon: React.ReactNode; cls: string; word: string }> = {
  met: { icon: <IconCheck />, cls: "c-green", word: "Done" },
  partial: { icon: <IconWarn />, cls: "c-amber", word: "Partly done" },
  missing: { icon: <IconCross />, cls: "c-red", word: "Missing" },
  unclear: { icon: <IconAsk />, cls: "c-muted", word: "Unclear" },
};

function RequirementsTab({ ctx, pr, result }: { ctx: Ctx; pr: PullRequest; result: ReviewResult }) {
  const used = result.guidelinesUsed ?? [];
  return (
    <>
      <h2 className="section-title">Does it do what was asked?</h2>
      {result.requirements.length ? (
        <div className="list">
          {result.requirements.map((r) => {
            const s = REQ_STATUS[r.status];
            return (
              <div className="li" key={r.requirement}>
                <span className={`icon ${s.cls}`}>{s.icon}</span>
                <div className="li-main"><b>{r.requirement}</b><small>{r.evidence} ({r.source})</small></div>
                <div className="li-end"><span className={s.cls} style={{ fontWeight: 500 }}>{s.word}</span></div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty"><b>No written requirements found</b>This change has no linked ticket or description to compare against.</div>
      )}
      <h2 className="section-title">Project rules used in this review</h2>
      {used.length ? (
        <div className="list">
          {used.map((g) => <div className="li center" key={g}><span className="icon c-muted"><IconDoc /></span><div className="li-main"><b>{g}</b></div></div>)}
        </div>
      ) : (
        <p style={{ color: "var(--text-2)" }}>No project rules were found for this review.</p>
      )}
      <p style={{ marginTop: 10 }}>
        <button className="link" onClick={() => ctx.go({ view: "project", scope: pr.repo })}>Add guideline documents for {shortRepo(pr.repo)}</button>
      </p>
    </>
  );
}

function CodeTab({ result, diff, service, onJump }: { result: ReviewResult; diff: DiffFile[]; service: string; onJump: (i: number) => void }) {
  if (!diff.length) return <div className="empty"><b>No code changes to show</b>The saved changes for this review aren't available.</div>;
  let budget = MAX_DIFF_LINES;
  let truncated = false;
  return (
    <>
      {diff.map((file) => {
        if (budget <= 0) {
          truncated = true;
          return null;
        }
        return (
          <div className="file" key={file.path}>
            <div className="file-name">{file.path}</div>
            {file.binary && <div className="dl hunk">Binary file</div>}
            <div className="diff">
              {file.hunks.map((h, hi) => {
                const lines = h.lines.slice(0, Math.max(0, budget));
                if (lines.length < h.lines.length) truncated = true;
                budget -= lines.length;
                return (
                  <div key={hi}>
                    <div className="dl hunk">{h.header}</div>
                    {lines.map((l, li) => {
                      const hits = l.newLine === undefined ? [] : result.findings.map((f, i) => ({ f, i })).filter(({ f }) => f.file === file.path && f.line === l.newLine);
                      return (
                        <div key={li}>
                          <div className={`dl ${l.kind}`}>
                            <span className="n">{l.newLine ?? l.oldLine}</span>
                            <span className="g">{l.kind === "add" ? "+" : l.kind === "del" ? "−" : ""}</span>
                            <span><Highlight text={l.text} /></span>
                          </div>
                          {hits.map(({ f, i }) => (
                            <div className="dl-flag" key={i}>
                              <button className={`sev s-${f.severity}`} title="Open this issue" onClick={() => onJump(i)}>{SEV[f.severity]}: {f.title}</button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {truncated && <p className="note">This change is very large, so only part of it is shown here. Open it on {service} to see all of it.</p>}
    </>
  );
}

/** The standards on the verdict card. Ones the change doesn't touch are left out to keep it short. */
function ComplianceLine({ result, catalog, onDetails }: { result: ReviewResult; catalog: ComplianceStandard[]; onDetails: () => void }) {
  const shown = (result.compliance ?? []).filter((c) => c.status !== "not_applicable");
  if (!shown.length) return null;
  const nameOf = (id: string) => catalog.find((s) => s.id === id)?.shortName ?? id;
  return (
    <div className="comp-line">
      <IconShield s={15} />
      {shown.map((c) => {
        const cls = COMPLIANCE_STATUS[c.status][1];
        const word = c.status === "issues" ? "has issues" : c.status === "pass" ? "passed" : "needs a check";
        return <span key={c.standard}><b>{nameOf(c.standard)}</b> <span className={cls}>{word}</span></span>;
      })}
      <button className="link" style={{ fontSize: "inherit" }} onClick={onDetails}>Details</button>
    </div>
  );
}

function CheckedTab({ result, catalog }: { result: ReviewResult; catalog: ComplianceStandard[] }) {
  const s = result.challengeStats;
  const skipped = result.coverage.filesSkipped;
  const compliance = result.compliance ?? [];
  return (
    <>
      {compliance.length > 0 && (
        <>
          <h2 className="section-title">Compliance and standards</h2>
          <div className="list">
            {compliance.map((c) => {
              const [word, cls] = COMPLIANCE_STATUS[c.status];
              return (
                <div className="li" key={c.standard}>
                  <span className="icon c-muted"><IconShield /></span>
                  <div className="li-main"><b>{catalog.find((x) => x.id === c.standard)?.name ?? c.standard}</b><small>{c.note}</small></div>
                  <div className="li-end"><span className={cls} style={{ fontWeight: 500 }}>{word}</span></div>
                </div>
              );
            })}
          </div>
          <p className="note">Checked against each standard's code-level controls. This doesn't make the project compliant or replace an audit.</p>
        </>
      )}
      <h2 className="section-title">What was checked</h2>
      <div className="list">
        {(Object.keys(AREA) as Dimension[]).map((k) => {
          const [word, cls] = AREA_RESULT[result.dimensions[k].status];
          return (
            <div className="li center" key={k}>
              <div className="li-main"><b>{AREA[k][0]}</b><small>{result.dimensions[k].note || AREA[k][1]}</small></div>
              <div className="li-end"><span className={cls} style={{ fontWeight: 500 }}>{word}</span></div>
            </div>
          );
        })}
      </div>
      {result.stack.length > 0 && (
        <>
          <h2 className="section-title">Reviewed as</h2>
          <div className="chips">{result.stack.map((x) => <span className="chip" key={x.name}>{x.name}{x.version ? ` ${x.version}` : ""}</span>)}</div>
        </>
      )}
      <h2 className="section-title">How issues were confirmed</h2>
      <p style={{ color: "var(--text-2)" }}>
        Specialists raised {plural(s.raised, "possible issue")}. A separate reviewer then tried to prove each one wrong: {s.rejected} ruled out and {s.kept} held up
        {s.raised - s.rejected > s.kept ? ", after combining duplicates." : "."}
      </p>
      {result.rejected.length > 0 && (
        <details className="more">
          <summary>Show what was ruled out ({result.rejected.length})</summary>
          <div className="list" style={{ marginTop: 6 }}>
            {result.rejected.map((r) => <div className="li" key={r.title}><div className="li-main"><b>{r.title}</b><small>{r.reason}</small></div></div>)}
          </div>
        </details>
      )}
      <h2 className="section-title">What was read</h2>
      <p style={{ color: "var(--text-2)" }}>{plural(result.coverage.filesReviewed, "file")} reviewed{skipped.length ? `, ${skipped.length} skipped.` : "."}</p>
      {skipped.length > 0 && (
        <details className="more">
          <summary>Show skipped files ({skipped.length})</summary>
          <div className="list" style={{ marginTop: 6 }}>
            {skipped.map((f) => <div className="li" key={f.path}><div className="li-main"><b>{f.path}</b><small>{f.reason}</small></div></div>)}
          </div>
        </details>
      )}
    </>
  );
}

function SendDialog({ pr, result, kept, onClose, onSent }: { pr: PullRequest; result: ReviewResult; kept: number; onClose: () => void; onSent: () => void }) {
  // After a merge, approving or requesting changes no longer does anything, so only comments are offered.
  const done = isFinished(pr);
  const kinds: SendEvent[] = done ? ["comment"] : (Object.keys(SEND) as SendEvent[]);
  const suggested: SendEvent = done ? "comment" : result.verdict === "request_changes" ? "request_changes" : result.verdict === "needs_discussion" ? "comment" : "approve";
  const [event, setEvent] = useState<SendEvent>(suggested);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const off = result.findings.length - kept;
  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await api().sendReview(pr.key, event);
      onSent();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <Dialog onClose={onClose}>
      <div className="d-head">
        <h2>Send your review</h2>
        <p>To {shortRepo(pr.repo)} {prNumber(pr)} on {PROVIDER_NAME[pr.provider]}, under your name.</p>
      </div>
      <div className="d-body">
        {done && <p className="note" style={{ margin: "0 0 10px" }}>This {unitName(pr)} is already {pr.status}, so it can only get comments. Fixes will need a new change.</p>}
        {kinds.map((k) => (
          <label className="choice" key={k}>
            <input type="radio" name="sendas" checked={event === k} onChange={() => setEvent(k)} />
            <span><b>{SEND[k][0]}{k === suggested ? " (suggested)" : ""}</b><small>{SEND[k][1]}</small></span>
          </label>
        ))}
        <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 12 }}>
          Includes the summary and {plural(kept, "comment")}.{off ? ` ${plural(off, "issue")} you turned off won't be sent.` : ""}
        </p>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <div className="d-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" data-autofocus disabled={busy} onClick={send}>{busy ? "Sending…" : "Send review"}</button>
      </div>
    </Dialog>
  );
}
