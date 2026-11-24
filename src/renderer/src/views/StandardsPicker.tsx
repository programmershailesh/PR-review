import { useState } from "react";
import type { ComplianceStandard } from "../../../shared/types";
import { Dialog, plural, shortRepo } from "../ui";

export function StandardsPicker({ scope, catalog, chosen, onAdd, onClose }: {
  scope: string;
  catalog: ComplianceStandard[];
  /** Standards this project already has. */
  chosen: Set<string>;
  onAdd: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const query = q.trim().toLowerCase();
  const matches = (s: ComplianceStandard) => !query || [s.name, s.shortName ?? "", s.category, s.region, s.summary ?? ""].join(" ").toLowerCase().includes(query);
  const available = catalog.filter((s) => s.status === "available" && matches(s));
  const planned = catalog.filter((s) => s.status === "planned" && matches(s));
  const categories = [...new Set(catalog.map((s) => s.category))];
  const toggle = (id: string, on: boolean) => setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));

  return (
    <Dialog onClose={onClose} wide>
      <div className="d-head">
        <h2>Add standards</h2>
        <p>{scope === "*" ? "Choose what every review must check." : `Choose what reviews of ${shortRepo(scope)} must check.`}</p>
      </div>
      <div className="d-body">
        <input className="input" data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, such as PCI, privacy or India" aria-label="Search standards" autoComplete="off" />
        <div className="pick-list">
          {categories.map((c) => {
            const items = available.filter((s) => s.category === c);
            if (!items.length) return null;
            return (
              <div key={c}>
                <div className="pick-cat">{c}</div>
                {items.map((s) => {
                  const added = chosen.has(s.id);
                  return (
                    <label key={s.id} className={`pick ${added ? "added" : ""}`}>
                      <input type="checkbox" checked={added || picked.includes(s.id)} disabled={added} onChange={(e) => toggle(s.id, e.target.checked)} />
                      <span>
                        <b>{s.name}</b><span className="region">{s.region}</span>
                        <small>{added ? "Already added" : s.summary}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            );
          })}
          {planned.length > 0 && (
            <details className="more" style={{ margin: "14px 10px 6px" }} open={Boolean(query) && !available.length}>
              <summary>Coming in the next update ({planned.length})</summary>
              <div className="chips" style={{ marginTop: 8 }}>
                {planned.map((s) => <span className="chip" key={s.id}>{s.name} · {s.region}</span>)}
              </div>
            </details>
          )}
          {!available.length && !planned.length && <div className="empty" style={{ border: 0, background: "none", padding: 28 }}>Nothing matches “{q}”.</div>}
        </div>
        <p className="note">Checks the code against each standard's controls. It doesn't make you compliant or replace an audit.</p>
      </div>
      <div className="d-foot">
        <span className="grow">{picked.length ? `${plural(picked.length, "standard")} selected` : ""}</span>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={!picked.length} onClick={() => onAdd(picked)}>{picked.length ? `Add ${picked.length}` : "Add"}</button>
      </div>
    </Dialog>
  );
}
