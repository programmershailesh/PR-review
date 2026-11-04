import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppState, GuidelineScope } from "../../shared/types";
import logo from "../../../build/icon.svg";
import { Dialog, api, errorText, prNumber, shortRepo } from "./ui";
import { ConnectDialog } from "./views/ConnectDialog";
import { ProjectsView } from "./views/ProjectList";
import { ProjectView } from "./views/Projects";
import { ReviewsView } from "./views/Reviews";
import { ReviewView } from "./views/Review";
import { SettingsView } from "./views/Settings";

export type Route =
  | { view: "reviews" }
  | { view: "review"; prKey: string }
  | { view: "projects" }
  | { view: "project"; scope: GuidelineScope }
  | { view: "settings" };

export interface Ctx {
  state: AppState;
  go(route: Route): void;
  toast(message: string, action?: { label: string; run: () => void }): void;
  openConnect(): void;
  /** Runs an action and shows any failure as a message. */
  attempt(fn: () => Promise<unknown>): void;
}

export const isMac = navigator.userAgent.includes("Mac");

function applyTheme(theme: AppState["settings"]["theme"]): void {
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = theme === "system" ? (dark ? "dark" : "light") : theme;
}

export function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [route, setRoute] = useState<Route>({ view: "reviews" });
  const [toastData, setToast] = useState<{ message: string; action?: { label: string; run: () => void } } | null>(null);
  const [overlay, setOverlay] = useState<"connect" | "search" | "keys" | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let live = true;
    void api().getState().then((s) => live && setState(s));
    const off = api().onState(setState);
    return () => {
      live = false;
      off();
    };
  }, []);

  const theme = state?.settings.theme;
  useEffect(() => {
    if (!theme) return;
    applyTheme(theme);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme(theme);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [theme]);

  const toast: Ctx["toast"] = (message, action) => {
    setToast({ message, action });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), action ? 7000 : 4000);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOverlay((o) => (o === "search" ? null : "search"));
        return;
      }
      if (document.querySelector("dialog[open]")) return;
      if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement).tagName)) return;
      if (e.key === "?") setOverlay("keys");
      if (e.key === "Escape") {
        setRoute((r) => (r.view === "review" ? { view: "reviews" } : r.view === "project" ? { view: "projects" } : r));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Dropping a file anywhere else must not navigate the app away.
  useEffect(() => {
    const stop = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  if (!state) return null;

  const ctx: Ctx = {
    state,
    go: setRoute,
    toast,
    openConnect: () => setOverlay("connect"),
    attempt: (fn) => void fn().catch((err) => toast(errorText(err))),
  };

  const ready = state.prs.filter((p) => state.reviews[p.key]?.state === "ready").length;
  const navItem = (view: "reviews" | "projects" | "settings", label: string, icon: ReactNode, extra?: ReactNode) => {
    const current = route.view === view || (view === "reviews" && route.view === "review") || (view === "projects" && route.view === "project");
    return (
      <button className="nav" aria-current={current ? "page" : undefined} onClick={() => setRoute({ view })}>
        {icon}
        {label}
        {extra}
      </button>
    );
  };

  let page: ReactNode;
  if (route.view === "review" && state.prs.some((p) => p.key === route.prKey)) page = <ReviewView key={route.prKey} ctx={ctx} prKey={route.prKey} />;
  else if (route.view === "projects") page = <div className="scroll"><ProjectsView ctx={ctx} /></div>;
  else if (route.view === "project") page = <div className="scroll"><ProjectView key={route.scope} ctx={ctx} scope={route.scope} /></div>;
  else if (route.view === "settings") page = <div className="scroll"><SettingsView ctx={ctx} onKeys={() => setOverlay("keys")} /></div>;
  else page = <div className="scroll"><ReviewsView ctx={ctx} /></div>;

  return (
    <div className={`app ${isMac ? "os-mac" : ""}`}>
      <header className="titlebar">
        <div className="brand"><img src={logo} alt="" width="22" height="22" /><span>Code Reviewer</span></div>
      </header>
      <nav className="side" aria-label="Main">
        {navItem(
          "reviews",
          "Reviews",
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M3 11.5 5 4h10l2 7.5V16H3z" /><path d="M3 11.5h4.5l1 2h3l1-2H17" /></svg>,
          ready ? <span className="count">{ready}</span> : undefined,
        )}
        {navItem(
          "projects",
          "Projects",
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 5h5l1.5 2h8.5v9h-15z" /></svg>,
        )}
        {navItem(
          "settings",
          "Settings",
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M3 6h8M15 6h2M3 14h2M9 14h8" /><circle cx="13" cy="6" r="2" /><circle cx="7" cy="14" r="2" /></svg>,
        )}
        <button className="nav" style={{ marginTop: 10 }} onClick={() => setOverlay("search")}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3.5 3.5" /></svg>
          Search<kbd>{isMac ? "⌘ K" : "Ctrl K"}</kbd>
        </button>
        <button className="side-foot" onClick={() => setRoute({ view: "settings" })} title="Reviews use your own Claude Code login">
          <span className="dot" style={state.claude.ok ? undefined : { background: "var(--red)" }} />
          {state.claude.ok ? "Claude Code connected" : "Claude Code not ready"}
        </button>
      </nav>
      <main>{page}</main>

      {overlay === "connect" && <ConnectDialog onClose={() => setOverlay(null)} ctx={ctx} />}
      {overlay === "search" && <SearchDialog ctx={ctx} onClose={() => setOverlay(null)} onKeys={() => setOverlay("keys")} />}
      {overlay === "keys" && <KeysDialog onClose={() => setOverlay(null)} />}

      <div className={`toast ${toastData ? "on" : ""}`} role="status">
        {toastData && <span>{toastData.message}</span>}
        {toastData?.action && (
          <button
            onClick={() => {
              toastData.action?.run();
              setToast(null);
            }}
          >
            {toastData.action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function SearchDialog({ ctx, onClose, onKeys }: { ctx: Ctx; onClose: () => void; onKeys: () => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const { state, go, openConnect } = ctx;
  const items = useMemo(() => {
    const repos = [...new Set(state.prs.map((p) => p.repo))];
    return [
      ...state.prs.map((p) => ({ label: p.title, hint: `${shortRepo(p.repo)} ${prNumber(p)}`, run: () => go({ view: "review", prKey: p.key }) })),
      ...repos.map((r) => ({ label: `Add guidelines to ${shortRepo(r)}`, hint: "Project", run: () => go({ view: "project", scope: r }) })),
      { label: "Reviews", hint: "Go to", run: () => go({ view: "reviews" }) },
      { label: "Projects", hint: "Go to", run: () => go({ view: "projects" }) },
      { label: "Settings", hint: "Go to", run: () => go({ view: "settings" }) },
      { label: "Connect an account", hint: "Action", run: openConnect },
      { label: "Keyboard shortcuts", hint: "Help", run: onKeys },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.prs]);
  const shown = items.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(q.toLowerCase()));
  const index = Math.min(sel, Math.max(0, shown.length - 1));
  const run = (i: number) => {
    const item = shown[i];
    if (!item) return;
    onClose();
    item.run();
  };
  return (
    <Dialog onClose={onClose}>
      <input
        className="palette-input"
        autoFocus
        placeholder="Search reviews, projects and actions"
        aria-label="Search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setSel(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && shown.length) {
            e.preventDefault();
            setSel((index + 1) % shown.length);
          } else if (e.key === "ArrowUp" && shown.length) {
            e.preventDefault();
            setSel((index - 1 + shown.length) % shown.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            run(index);
          }
        }}
      />
      <div className="palette-list">
        {shown.map((item, i) => (
          <button key={`${item.label}${item.hint}`} className={`pal ${i === index ? "sel" : ""}`} onClick={() => run(i)}>
            <span>{item.label}</span>
            <small>{item.hint}</small>
          </button>
        ))}
        {!shown.length && <div className="empty" style={{ border: 0, background: "none" }}>No matches</div>}
      </div>
    </Dialog>
  );
}

function KeysDialog({ onClose }: { onClose: () => void }) {
  const rows: [ReactNode, string][] = [
    [<kbd key="k">{isMac ? "⌘" : "Ctrl"} K</kbd>, "Search everything"],
    [<><kbd>J</kbd> <kbd>K</kbd></>, "Next or previous issue"],
    [<kbd key="x">X</kbd>, "Include or exclude the open issue"],
    [<kbd key="s">S</kbd>, "Send review"],
    [<kbd key="e">Esc</kbd>, "Go back"],
    [<kbd key="q">?</kbd>, "Show this list"],
  ];
  return (
    <Dialog onClose={onClose}>
      <div className="d-head"><h2>Keyboard shortcuts</h2></div>
      <div className="d-body">
        <div className="keys">
          {rows.map(([keys, text]) => (
            <div key={text} style={{ display: "contents" }}>
              <span>{keys}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="d-foot"><button className="btn" autoFocus onClick={onClose}>Close</button></div>
    </Dialog>
  );
}
