import { useState, type FormEvent } from "react";
import { parsePrLink } from "../../../shared/pr-link";
import { PROVIDER_NAME } from "../../../shared/types";
import type { Ctx } from "../App";
import { Dialog, IconCheck, IconWarn, api, errorText } from "../ui";

/** What the dialog can tell from the link alone, before asking the server. */
function check(ctx: Ctx, text: string): { ok: boolean; message: string; existing?: string } | null {
  if (!text.trim()) return null;
  const link = parsePrLink(text);
  if ("error" in link) return { ok: false, message: link.error };
  const accounts = ctx.state.accounts.filter((a) => a.host === link.host);
  const unit = link.provider === "gitlab" ? "merge request" : "pull request";
  if (!accounts.length) return { ok: false, message: `No account for ${link.host} is connected. Connect it in Settings first, so Code Reviewer can read this ${unit}.` };
  const matching = accounts.filter((a) => a.provider === link.provider);
  if (!matching.length) return { ok: false, message: `${link.host} is connected as ${PROVIDER_NAME[accounts[0]!.provider]}, but this is a ${PROVIDER_NAME[link.provider]} link.` };
  const ids = new Set(matching.map((a) => a.id));
  const existing = ctx.state.prs.find((p) => ids.has(p.accountId) && p.repo.toLowerCase() === link.repo.toLowerCase() && p.number === link.number);
  if (existing) return { ok: true, message: `Already in your list: ${existing.title}`, existing: existing.key };
  return { ok: true, message: `${PROVIDER_NAME[link.provider]} · ${link.repo} ${link.provider === "gitlab" ? "!" : "#"}${link.number}` };
}

export function LinkDialog({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const info = check(ctx, text);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!info?.ok || busy) return;
    if (info.existing) {
      onClose();
      ctx.go({ view: "review", prKey: info.existing });
      return;
    }
    setBusy(true);
    setError("");
    try {
      const key = await api().addByLink(text);
      onClose();
      ctx.go({ view: "review", prKey: key });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <Dialog onClose={onClose}>
      <form onSubmit={submit}>
        <div className="d-head">
          <h2>Review by link</h2>
          <p>Paste a link to any pull request or merge request you can access, open or already merged. It's reviewed next, ahead of the queue.</p>
        </div>
        <div className="d-body">
          <input
            className="input"
            data-autofocus
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
            placeholder="https://github.com/owner/repo/pull/123"
            aria-label="Pull request or merge request link"
            autoComplete="off"
            spellCheck={false}
          />
          <div className={`link-info ${error || (info && !info.ok) ? "bad" : info ? "good" : ""}`} role="status">
            {error ? <><IconWarn s={15} /><span>{error}</span></> : info && (info.ok ? <IconCheck s={15} /> : <IconWarn s={15} />)}
            {!error && info && <span>{info.message}</span>}
          </div>
        </div>
        <div className="d-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!info?.ok || busy}>{busy ? "Checking…" : info?.existing ? "Open it" : "Review"}</button>
        </div>
      </form>
    </Dialog>
  );
}
