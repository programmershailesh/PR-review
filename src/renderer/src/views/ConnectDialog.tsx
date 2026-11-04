import { useState, type FormEvent } from "react";
import type { Ctx } from "../App";
import { Dialog, api, errorText } from "../ui";

export function ConnectDialog({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const [host, setHost] = useState("github.com");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api().connectAccount({ provider: "github", host, token });
      onClose();
      ctx.toast("GitHub connected.");
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const cleanHost = host.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "") || "github.com";
  const tokenUrl = `https://${cleanHost}/settings/tokens/new?scopes=repo&description=Code%20Reviewer`;

  return (
    <Dialog onClose={onClose}>
      <form onSubmit={submit}>
        <div className="d-head">
          <h2>Connect GitHub</h2>
          <p>Code Reviewer needs an access token to see your assigned PRs and send your reviews. It's stored encrypted in your system keychain.</p>
        </div>
        <div className="d-body">
          <label className="field">
            Server
            <input className="input" value={host} onChange={(e) => setHost(e.target.value)} autoComplete="off" spellCheck={false} />
          </label>
          <label className="field">
            Access token
            <input className="input" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" autoFocus spellCheck={false} />
          </label>
          <p style={{ fontSize: 14, color: "var(--text-2)" }}>
            <button type="button" className="link" onClick={() => ctx.attempt(() => api().openExternal(tokenUrl))}>
              Create a token on GitHub
            </button>{" "}
            with the <code>repo</code> permission, then paste it here.
          </p>
          <p className="note">GitLab and Bitbucket are coming next.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <div className="d-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy || !token.trim()}>{busy ? "Checking…" : "Connect"}</button>
        </div>
      </form>
    </Dialog>
  );
}
