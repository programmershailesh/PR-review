import { useState, type DragEvent, type FormEvent } from "react";
import { ALL_PROJECTS, type AddFilesOutcome, type DocLevel, type GuidelineDoc, type GuidelineScope } from "../../../shared/types";
import type { Ctx } from "../App";
import { Switch, api, errorText, plural, shortRepo } from "../ui";

function fmtSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${Math.max(1, Math.round(b / 1024))} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

function DocRow({ doc, ctx }: { doc: GuidelineDoc; ctx: Ctx }) {
  const ext = doc.name.split(".").pop()?.toUpperCase().slice(0, 4) ?? "";
  const { attempt } = ctx;
  return (
    <div className="li center">
      <span className="ftype" aria-hidden="true">{ext}</span>
      <div className="li-main">
        <b>{doc.name}</b>
        <small>
          {doc.status === "reading" && <span className="c-accent">Reading the document…</span>}
          {doc.status === "failed" && <span className="c-red">{doc.error}</span>}
          {doc.status === "ready" && `${fmtSize(doc.size)} · Added ${new Date(doc.addedAt).toLocaleDateString()}`}
        </small>
      </div>
      {doc.status !== "reading" && (
        <div className="li-end">
          {doc.status === "ready" && (
            <>
              <select
                className="mini"
                aria-label={`How strictly to apply ${doc.name}`}
                value={doc.level}
                onChange={(e) => attempt(() => api().updateDoc(doc.id, { level: e.target.value as DocLevel }))}
              >
                <option value="must">Must follow</option>
                <option value="recommended">Recommended</option>
              </select>
              <Switch on={doc.on} label={`Use ${doc.name} in reviews`} onChange={(on) => attempt(() => api().updateDoc(doc.id, { on }))} />
            </>
          )}
          <button className="link" aria-label={`Remove ${doc.name}`} onClick={() => attempt(() => api().removeDoc(doc.id))}>Remove</button>
        </div>
      )}
    </div>
  );
}

export function ProjectView({ ctx, scope }: { ctx: Ctx; scope: GuidelineScope }) {
  const { state, go, attempt, toast } = ctx;
  const [over, setOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [rule, setRule] = useState("");
  const [readySnapshot] = useState(() => new Set(state.docs.filter((d) => d.status === "ready").map((d) => d.id)));
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  const isAll = scope === ALL_PROJECTS;
  const docs = state.docs.filter((d) => d.scope === scope);
  const rules = state.rules[scope] ?? [];
  const openReviews = state.prs.filter((p) => state.reviews[p.key]?.state === "ready" && (isAll || p.repo === scope));
  const newlyReady = docs.filter((d) => d.status === "ready" && !readySnapshot.has(d.id));
  const lastNew = newlyReady[newlyReady.length - 1];

  const handle = async (run: () => Promise<AddFilesOutcome>) => {
    try {
      const { errors: errs } = await run();
      setErrors(errs);
      setNoticeDismissed(false);
    } catch (err) {
      setErrors([errorText(err)]);
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const paths = [...e.dataTransfer.files].map((f) => api().pathForFile(f)).filter(Boolean);
    if (paths.length) void handle(() => api().addGuidelineFiles(scope, paths));
  };
  const addRule = (e: FormEvent) => {
    e.preventDefault();
    if (!rule.trim()) return;
    const text = rule;
    setRule("");
    attempt(() => api().addRule(scope, text));
  };
  const recheck = () => {
    setNoticeDismissed(true);
    attempt(async () => {
      for (const p of openReviews) await api().startReview(p.key);
      toast(`Reviewing ${plural(openReviews.length, "change")} again.`);
    });
  };

  return (
    <div className="col">
      <button className="back" onClick={() => go({ view: "projects" })}>← Projects</button>
      <h1 className="page-title">{shortRepo(scope)}</h1>
      <p className="page-sub">{isAll ? "Documents here apply to every review, in every project." : "Every review of this project is checked against these guidelines."}</p>

      <h2 className="section-title">Guideline documents</h2>
      <div
        className={`drop ${over ? "over" : ""}`}
        onDragEnter={(e) => { e.preventDefault(); setOver(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V5M7.5 9.5 12 5l4.5 4.5" /><path d="M4 15v4h16v-4" /></svg>
        <b>Drop documents here</b>
        <small>PDF, Word, Markdown or text, up to 25 MB each</small>
        <button className="btn small" onClick={() => void handle(() => api().pickGuidelineFiles(scope))}>Choose files</button>
      </div>
      {errors.map((m) => <p className="up-error" role="alert" key={m}>{m}</p>)}
      {lastNew && openReviews.length > 0 && !noticeDismissed && (
        <div className="notice">
          <span>"{lastNew.name}" is ready. New reviews will use it. Check {plural(openReviews.length, "open review")} again with it too?</span>
          <button className="btn small" onClick={recheck}>Review again</button>
        </div>
      )}
      {docs.length > 0 && <div className="list" style={{ marginTop: 10 }}>{docs.map((d) => <DocRow key={d.id} doc={d} ctx={ctx} />)}</div>}
      <p className="note">Documents stay on this computer. They're shared with Claude only during a review, through your Claude Code login.</p>

      <h2 className="section-title">Quick rules</h2>
      <div className="list">
        {rules.map((t, i) => (
          <div className="li center" key={`${i}${t}`}>
            <div className="li-main">{t}</div>
            <div className="li-end"><button className="link" aria-label="Remove rule" onClick={() => attempt(() => api().removeRule(scope, i))}>Remove</button></div>
          </div>
        ))}
        <form className="add-rule" onSubmit={addRule}>
          <input className="input" value={rule} onChange={(e) => setRule(e.target.value)} placeholder="Add a rule, such as “All API errors must use our error format”" aria-label="New rule" autoComplete="off" />
          <button className="btn small">Add</button>
        </form>
      </div>
      {!isAll && <p className="note">Files like CLAUDE.md and CONTRIBUTING.md are also found in the project automatically. They're read from the target branch, so a change can't rewrite the rules it's judged by.</p>}
    </div>
  );
}
