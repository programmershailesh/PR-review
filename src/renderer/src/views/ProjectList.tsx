import { useState } from "react";
import { projectEnabled, sortProjects } from "../../../shared/priority";
import { ALL_PROJECTS } from "../../../shared/types";
import type { Ctx } from "../App";
import { Switch, api, plural, shortRepo } from "../ui";

const ADD_LIST_LIMIT = 8;

export function ProjectsView({ ctx }: { ctx: Ctx }) {
  const { state, go, attempt, openConnect, toast } = ctx;
  const { projects, projectOrder, settings, prs, reviews, repositories, docs, rules, accounts } = state;
  const [q, setQ] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const enabled = (repo: string) => projectEnabled(repo, projects, settings.reviewNewProjects);
  const assigned = new Set(prs.map((p) => p.repo));
  const chosen = Object.keys(projects).filter((r) => projects[r]?.enabled);
  // Ranked: on, and either chosen by the user or has something assigned right now.
  const ranked = sortProjects([...new Set([...chosen, ...projectOrder, ...assigned])].filter(enabled), projectOrder);
  const off = sortProjects([...new Set([...Object.keys(projects), ...assigned])].filter((r) => !enabled(r)), []);
  const listed = new Set([...ranked, ...off]);
  const available = [...new Set(repositories.map((r) => r.name))].filter((r) => !listed.has(r));
  const query = q.trim().toLowerCase();
  const matches = available.filter((r) => r.toLowerCase().includes(query));

  const waiting = (repo: string) => prs.filter((p) => p.repo === repo && (reviews[p.key]?.state === "queued" || reviews[p.key]?.state === "running")).length;
  const openCount = (repo: string) => prs.filter((p) => p.repo === repo && reviews[p.key]?.state !== "sent").length;
  const guideLabel = (repo: string) => {
    const s = state.compliance[repo]?.length ?? 0;
    const n = docs.filter((d) => d.scope === repo).length;
    const m = rules[repo]?.length ?? 0;
    return [s ? plural(s, "standard") : "", n ? plural(n, "document") : "", m ? plural(m, "rule") : ""].filter(Boolean).join(", ");
  };
  const stackOf = (repo: string): string => {
    for (const p of prs) {
      if (p.repo !== repo) continue;
      const stack = reviews[p.key]?.result?.stack;
      if (stack?.length) return stack.slice(0, 3).map((s) => s.name).join(", ");
    }
    return "";
  };
  const meta = (repo: string) => {
    const open = openCount(repo);
    const parts = [open ? plural(open, "open change") : "Nothing assigned", waiting(repo) ? `${waiting(repo)} in the queue` : "", stackOf(repo), guideLabel(repo)];
    return parts.filter(Boolean).join(" · ");
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= ranked.length) return;
    const next = [...ranked];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item as string);
    attempt(() => api().setProjectOrder(next));
  };

  const loadRepos = () => {
    setLoading(true);
    attempt(async () => {
      try {
        await api().refreshRepositories();
        toast("Project list updated.");
      } finally {
        setLoading(false);
      }
    });
  };

  const nameFor = (repo: string) => <b title={repo}>{repo}</b>;

  return (
    <div className="col">
      <h1 className="page-title">Projects</h1>
      <p className="page-sub">Choose which projects get reviewed and which go first. Open a project's guidelines to tell the reviewer how it should be built.</p>

      <h2 className="section-title">Review order</h2>
      {ranked.length ? (
        <>
          <div className="list">
            {ranked.map((repo, i) => (
              <div
                key={repo}
                className={`li center project-row ${overIndex === i && dragging !== null && dragging !== i ? "drop-target" : ""} ${dragging === i ? "dragging" : ""}`}
                draggable
                onDragStart={(e) => {
                  setDragging(i);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", repo);
                }}
                onDragOver={(e) => {
                  if (dragging === null) return;
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragging !== null) move(dragging, i);
                  setDragging(null);
                  setOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setOverIndex(null);
                }}
              >
                <span className="grip" aria-hidden="true" title="Drag to change priority">
                  <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2" cy="3" r="1.4" /><circle cx="8" cy="3" r="1.4" /><circle cx="2" cy="8" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="2" cy="13" r="1.4" /><circle cx="8" cy="13" r="1.4" /></svg>
                </span>
                <span className="rank" aria-label={`Priority ${i + 1}`}>{i + 1}</span>
                <div className="li-main">{nameFor(repo)}<small>{meta(repo)}</small></div>
                <div className="li-end">
                  <span className="move-btns">
                    <button className="move" disabled={i === 0} aria-label={`Move ${repo} up`} title="Move up" onClick={() => move(i, i - 1)}>↑</button>
                    <button className="move" disabled={i === ranked.length - 1} aria-label={`Move ${repo} down`} title="Move down" onClick={() => move(i, i + 1)}>↓</button>
                  </span>
                  <button className="link" onClick={() => go({ view: "project", scope: repo })}>Guidelines</button>
                  <Switch on label={`Review ${repo}`} onChange={(v) => attempt(() => api().setProjectEnabled(repo, v))} />
                </div>
              </div>
            ))}
          </div>
          <p className="note">The next review always comes from the highest project with something waiting. A review already running finishes first. A review you start yourself goes ahead of this order.</p>
        </>
      ) : (
        <div className="empty"><b>No projects chosen yet</b>Add a project below to have its changes reviewed.</div>
      )}

      {off.length > 0 && (
        <>
          <h2 className="section-title">Turned off</h2>
          <div className="list">
            {off.map((repo) => (
              <div className="li center" key={repo}>
                <div className="li-main">{nameFor(repo)}<small>{openCount(repo) ? `${plural(openCount(repo), "open change")} not being reviewed` : "Nothing assigned"}</small></div>
                <div className="li-end">
                  <button className="link" onClick={() => go({ view: "project", scope: repo })}>Guidelines</button>
                  <Switch on={false} label={`Review ${repo}`} onChange={(v) => attempt(() => api().setProjectEnabled(repo, v))} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">Add a project</h2>
      {accounts.length ? (
        <>
          <div className="tools" style={{ margin: "0 0 8px" }}>
            <input className="input" placeholder={`Search ${plural(available.length, "project")}`} aria-label="Search your projects" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn" disabled={loading} onClick={loadRepos}>{loading ? "Updating…" : "Update list"}</button>
          </div>
          {matches.length > 0 && (
            <div className="list">
              {matches.slice(0, ADD_LIST_LIMIT).map((repo) => (
                <div className="li center" key={repo}>
                  <div className="li-main">{nameFor(repo)}</div>
                  <div className="li-end"><button className="btn small" aria-label={`Add ${repo}`} onClick={() => attempt(() => api().setProjectEnabled(repo, true))}>Add</button></div>
                </div>
              ))}
            </div>
          )}
          {matches.length > ADD_LIST_LIMIT && <p className="note">Showing {ADD_LIST_LIMIT} of {matches.length}. Search to find others.</p>}
          {!matches.length && <p className="note">{query ? "No projects match that search." : "No other projects found. Your token only shows projects it has access to."}</p>}
        </>
      ) : (
        <div className="empty"><b>Connect an account first</b>Your projects will be listed here.<br /><button className="btn primary" onClick={openConnect}>Connect an account</button></div>
      )}

      <div className="list" style={{ marginTop: 16 }}>
        <div className="li center">
          <div className="li-main">
            <b>Review new projects automatically</b>
            <small>{settings.reviewNewProjects ? "A change from a project not listed above is reviewed too, after the projects you've ranked." : "Only the projects you've added are reviewed. Changes from others still appear in Reviews."}</small>
          </div>
          <div className="li-end"><Switch on={settings.reviewNewProjects} label="Review new projects automatically" onChange={(reviewNewProjects) => attempt(() => api().updateSettings({ reviewNewProjects }))} /></div>
        </div>
      </div>

      <h2 className="section-title">Company-wide guidelines</h2>
      <div className="list">
        <button className="li li-btn center" onClick={() => go({ view: "project", scope: ALL_PROJECTS })}>
          <div className="li-main"><b>{shortRepo(ALL_PROJECTS)}</b><small>Rules that apply to every review</small></div>
          <div className="li-end c-muted">{guideLabel(ALL_PROJECTS) || "No documents yet"}</div>
        </button>
      </div>
    </div>
  );
}
