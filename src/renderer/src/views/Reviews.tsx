import { useState } from "react";
import { projectEnabled, queueOrder, sortProjects } from "../../../shared/priority";
import type { PullRequest, ReviewRecord } from "../../../shared/types";
import type { Ctx } from "../App";
import { IconCheck, IconCross, IconLink, TONE, VerdictIcon, api, isFinished, plural, prNumber, shortRepo, timeAgo, verdictWord } from "../ui";

function Outcome({ pr, review, off, position }: { pr: PullRequest; review?: ReviewRecord; off: boolean; position: number }) {
  if (!review) return <span className="outcome c-muted">{off ? "Project is off" : "Not reviewed"}</span>;
  if (review.state === "ready" && review.result) {
    const v = review.result.verdict;
    const n = review.result.findings.filter((_, i) => review.drafts[i]?.included !== false).length;
    return (
      <>
        <span className={`outcome c-${TONE[v]}`}><VerdictIcon verdict={v} s={15} />{verdictWord(v, pr)}</span>
        <span className="row-count">{n ? plural(n, "issue") : "No issues"}</span>
      </>
    );
  }
  if (review.state === "running") return <span className="outcome c-accent">Reviewing…</span>;
  if (review.state === "queued") return <span className="outcome c-muted">{position <= 1 ? "Up next" : `#${position} in queue`}</span>;
  if (review.state === "failed") return <span className="outcome c-red"><IconCross s={15} />Couldn't finish</span>;
  return <span className="outcome c-muted"><IconCheck s={15} />Review sent</span>;
}

export function ReviewsView({ ctx }: { ctx: Ctx }) {
  const { state, go, openConnect, openLink, attempt } = ctx;
  const [q, setQ] = useState("");

  if (!state.accounts.length) {
    return (
      <div className="col">
        <h1 className="page-title">Reviews</h1>
        <ClaudeBanner ctx={ctx} />
        <div className="empty" style={{ marginTop: 24 }}>
          <b>Connect an account to get started</b>
          Anything assigned to you on GitHub or GitLab will show up here and get reviewed automatically.
          <br />
          <button className="btn primary" onClick={openConnect}>Connect an account</button>
        </div>
      </div>
    );
  }

  const stateOf = (p: PullRequest) => state.reviews[p.key]?.state;
  const needsYou = state.prs.filter((p) => stateOf(p) === "ready").length;
  const query = q.trim().toLowerCase();
  const isOff = (p: PullRequest) => !projectEnabled(p.repo, state.projects, state.settings.reviewNewProjects);
  const rankOrder = sortProjects([...new Set(state.prs.map((p) => p.repo))], state.projectOrder);
  const queue = queueOrder(state.prs, state.reviews, state.projectOrder);
  const shown = state.prs
    .filter((p) => !query || `${p.title} ${p.repo} ${p.author} ${p.number}`.toLowerCase().includes(query))
    .sort((a, b) => rankOrder.indexOf(a.repo) - rankOrder.indexOf(b.repo));
  const row = (p: PullRequest) => (
    <button className="row" key={p.key} onClick={() => go({ view: "review", prKey: p.key })}>
      <span className="row-main">
        <span className="row-title" style={{ display: "block" }}>{p.title}{isFinished(p) && <> <span className="tag">{p.status === "merged" ? "Merged" : "Closed"}</span></>}</span>
        <span className="row-meta" style={{ display: "block" }}>{shortRepo(p.repo)} {prNumber(p)} · {p.author} · {timeAgo(p.updatedAt)}{p.addedByLink ? " · added by link" : ""}</span>
      </span>
      <span className="row-end"><Outcome pr={p} review={state.reviews[p.key]} off={isOff(p)} position={queue.indexOf(p) + 1} /></span>
    </button>
  );
  const group = (title: string, prs: PullRequest[]) =>
    prs.length ? (
      <div key={title}>
        <h2 className="section-title">{title}</h2>
        {prs.map(row)}
      </div>
    ) : null;
  const errors = state.accounts.filter((a) => a.error);

  return (
    <div className="col">
      <h1 className="page-title">{needsYou ? `${plural(needsYou, "review")} need${needsYou === 1 ? "s" : ""} your decision` : "You're all caught up"}</h1>
      <div className="refresh-line">
        <span>{state.refreshing ? "Checking for new requests…" : state.lastRefreshAt ? `Last checked ${timeAgo(state.lastRefreshAt)}` : ""}</span>
        <button className="link" disabled={state.refreshing} onClick={() => attempt(() => api().refresh())}>Check now</button>
      </div>
      <ClaudeBanner ctx={ctx} />
      {errors.map((a) => (
        <div className="banner error" key={a.id} role="alert">
          <span>{a.username} on {a.host}: {a.error}</span>
          <button className="btn small" onClick={() => go({ view: "settings" })}>Open settings</button>
        </div>
      ))}
      <div className="tools">
        {state.prs.length > 0 && <input className="input" placeholder="Search by title, project or person" aria-label="Search reviews" value={q} onChange={(e) => setQ(e.target.value)} />}
        <button className="btn" onClick={openLink}><IconLink />Review by link</button>
      </div>
      {!shown.length && (
        <div className="empty" style={{ marginTop: 16 }}>
          <b>{query ? "No matches" : "Nothing assigned to you"}</b>
          {query ? "Try a different search." : "New requests will show up here on their own. To review anything else, even a merged change, use Review by link."}
        </div>
      )}
      {group("Ready for you", shown.filter((p) => stateOf(p) === "ready"))}
      {group("Being reviewed", [...shown.filter((p) => stateOf(p) === "running"), ...queue.filter((p) => shown.includes(p))])}
      {group("Needs attention", shown.filter((p) => stateOf(p) === "failed" || (!stateOf(p) && !isOff(p))))}
      {group("Projects turned off", shown.filter((p) => !stateOf(p) && isOff(p)))}
      {group("Finished", shown.filter((p) => stateOf(p) === "sent"))}
    </div>
  );
}

export function ClaudeBanner({ ctx }: { ctx: Ctx }) {
  const { claude } = ctx.state;
  if (claude.ok) return null;
  return (
    <div className="banner" role="alert">
      <span>{claude.message}</span>
      <button className="btn small" onClick={() => ctx.attempt(() => api().checkClaude())}>Check again</button>
    </div>
  );
}
