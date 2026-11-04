import { useState, type FormEvent } from "react";
import { PROVIDER_NAME } from "../../../shared/types";
import type { Ctx } from "../App";
import { Dialog, api, errorText } from "../ui";
import { Segmented } from "./Settings";

type Service = "github" | "gitlab";

const DEFAULT_HOST: Record<Service, string> = { github: "github.com", gitlab: "gitlab.com" };
const PERMISSION: Record<Service, string> = { github: "repo", gitlab: "api" };
const tokenUrl: Record<Service, (host: string) => string> = {
  github: (host) => `https://${host}/settings/tokens/new?scopes=repo&description=Code%20Reviewer`,
  gitlab: (host) => `https://${host}/-/user_settings/personal_access_tokens?name=Code%20Reviewer&scopes=api`,
};

export function ConnectDialog({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  const [service, setService] = useState<Service>("github");
  const [host, setHost] = useState(DEFAULT_HOST.github);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = PROVIDER_NAME[service];

  const choose = (next: Service) => {
    setService(next);
    // A server the user typed themselves stays. Only the other service's default is swapped.
    if (host === DEFAULT_HOST[service]) setHost(DEFAULT_HOST[next]);
    setError("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api().connectAccount({ provider: service, host, token });
      onClose();
      ctx.toast(`${name} connected.`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const cleanHost = host.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "") || DEFAULT_HOST[service];

  return (
    <Dialog onClose={onClose}>
      <form onSubmit={submit}>
        <div className="d-head">
          <h2>Connect {name}</h2>
          <p>Code Reviewer needs an access token to see what's assigned to you and send your reviews. It's stored encrypted in your system keychain.</p>
        </div>
        <div className="d-body">
          <div style={{ marginBottom: 16 }}>
            <Segmented label="Git service" value={service} items={[["github", "GitHub"], ["gitlab", "GitLab"]]} onChange={choose} />
          </div>
          <label className="field">
            Server
            <input className="input" value={host} onChange={(e) => setHost(e.target.value)} autoComplete="off" spellCheck={false} />
          </label>
          <label className="field">
            Access token
            <input className="input" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" data-autofocus spellCheck={false} />
          </label>
          <p style={{ fontSize: 14, color: "var(--text-2)" }}>
            <button type="button" className="link" onClick={() => ctx.attempt(() => api().openExternal(tokenUrl[service](cleanHost)))}>
              Create a token on {name}
            </button>{" "}
            with the <code>{PERMISSION[service]}</code> permission, then paste it here.
          </p>
          <p className="note">Bitbucket is coming next.</p>
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
