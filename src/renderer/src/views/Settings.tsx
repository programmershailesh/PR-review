import type { Settings } from "../../../shared/types";
import type { Ctx } from "../App";
import { Switch, api } from "../ui";

function Segmented<T extends string>({ value, items, onChange, label }: { value: T; items: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {items.map(([v, l]) => (
        <button key={v} aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

export function SettingsView({ ctx, onKeys }: { ctx: Ctx; onKeys: () => void }) {
  const { state, attempt, openConnect, toast } = ctx;
  const { claude, settings, accounts } = state;
  const set = (patch: Partial<Settings>) => attempt(() => api().updateSettings(patch));

  return (
    <div className="col">
      <h1 className="page-title">Settings</h1>

      <h2 className="section-title" style={{ marginTop: 24 }}>Claude Code</h2>
      <div className="list">
        <div className="li center">
          <span className="dot" style={{ margin: "0 3px", ...(claude.ok ? {} : { background: "var(--red)" }) }} />
          <div className="li-main">
            <b>{claude.ok ? `Connected with your ${(claude.subscriptionType ?? "").replace(/^./, (c) => c.toUpperCase())} subscription` : "Not ready"}</b>
            <small>{claude.ok ? `Reviews use Claude Code ${claude.version}, already signed in on this computer. No API key is used, and any set on this computer is ignored.` : claude.message}</small>
          </div>
          <div className="li-end">
            <button
              className="btn small"
              onClick={() => attempt(async () => {
                await api().checkClaude();
                toast("Checked Claude Code.");
              })}
            >
              Check again
            </button>
          </div>
        </div>
      </div>

      <h2 className="section-title">Git accounts</h2>
      <div className="list">
        {accounts.map((a) => (
          <div className="li center" key={a.id}>
            <div className="li-main">
              <b>GitHub</b>
              <small>{a.host} · {a.username}</small>
              {a.error && <small className="c-red">{a.error}</small>}
            </div>
            <div className="li-end">
              <button className="btn small" onClick={() => attempt(() => api().disconnectAccount(a.id))}>Disconnect</button>
            </div>
          </div>
        ))}
        <button className="li li-btn center" onClick={openConnect}>
          <div className="li-main">
            <b>{accounts.length ? "Add another account" : "Connect an account"}</b>
            <small>GitHub or GitHub Enterprise. GitLab and Bitbucket are coming next.</small>
          </div>
          <span className="c-muted">+</span>
        </button>
      </div>

      <h2 className="section-title">Reviews</h2>
      <div className="list">
        <div className="li center">
          <div className="li-main"><b>Start automatically</b><small>Begin as soon as something is assigned to you, while the app is open.</small></div>
          <div className="li-end"><Switch on={settings.autoStart} label="Start automatically" onChange={(autoStart) => set({ autoStart })} /></div>
        </div>
        <div className="li center">
          <div className="li-main"><b>Notify me</b><small>Send a notification when a review is ready.</small></div>
          <div className="li-end"><Switch on={settings.notify} label="Notify me" onChange={(notify) => set({ notify })} /></div>
        </div>
        <div className="li center">
          <div className="li-main">
            <b>Review depth</b>
            <small>{settings.depth === "thorough" ? "All specialists plus double-checking. Uses more of your Claude limit." : "Correctness, security and requirements only, plus double-checking. Uses less of your Claude limit."}</small>
          </div>
          <div className="li-end"><Segmented label="Review depth" value={settings.depth} items={[["quick", "Quick"], ["thorough", "Thorough"]]} onChange={(depth) => set({ depth })} /></div>
        </div>
      </div>
      <p className="note">Nothing is ever posted until you press Send.</p>

      <h2 className="section-title">Appearance</h2>
      <div className="list">
        <div className="li center">
          <div className="li-main"><b>Theme</b></div>
          <div className="li-end"><Segmented label="Theme" value={settings.theme} items={[["system", "System"], ["light", "Light"], ["dark", "Dark"]]} onChange={(theme) => set({ theme })} /></div>
        </div>
        <button className="li li-btn center" onClick={onKeys}><div className="li-main"><b>Keyboard shortcuts</b></div><span className="c-muted">›</span></button>
      </div>
    </div>
  );
}
