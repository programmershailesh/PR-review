import { useEffect, useRef, type ReactNode } from "react";
import type { PullRequest, Severity, Verdict, CodeReviewerApi } from "../../shared/types";

declare global {
  interface Window {
    codeReviewer: CodeReviewerApi;
  }
}
export const api = (): CodeReviewerApi => window.codeReviewer;

export const WORD: Record<Verdict, string> = {
  request_changes: "Don't merge yet",
  needs_discussion: "Needs a decision",
  approve_with_comments: "OK to merge, with notes",
  approve: "OK to merge",
};
export const TONE: Record<Verdict, string> = {
  request_changes: "red",
  needs_discussion: "amber",
  approve_with_comments: "blue",
  approve: "green",
};
export const SEV: Record<Severity, string> = { blocker: "Must fix", major: "Should fix", minor: "Nice to have", nit: "Nice to have" };

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
export const shortRepo = (repo: string) => (repo === "*" ? "All projects" : repo.split("/").pop() ?? repo);
/** How the service itself writes this PR's number: #12 on GitHub, !12 on GitLab. */
export const prNumber = (pr: Pick<PullRequest, "provider" | "number">) => `${pr.provider === "gitlab" ? "!" : "#"}${pr.number}`;

export function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(mins)) return "";
  if (mins < 1) return "just now";
  if (mins < 60) return `${plural(mins, "min")} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${plural(hours, "hour")} ago`;
  return `${plural(Math.round(hours / 24), "day")} ago`;
}

export function errorText(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Electron prefixes errors that cross from the main process.
  return raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
}

const svg = (size: number, body: ReactNode, sw = 2) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {body}
  </svg>
);
export const IconCheck = ({ s = 16 }: { s?: number }) => svg(s, <path d="M3 8.5 6.5 12 13 4.5" />);
export const IconCross = ({ s = 16 }: { s?: number }) => svg(s, <path d="M4 4l8 8M12 4l-8 8" />);
export const IconWarn = ({ s = 16 }: { s?: number }) => svg(s, <><path d="M8 2 14.5 13.5h-13z" /><path d="M8 6.5v3M8 11.5v.01" /></>, 1.8);
export const IconAsk = ({ s = 16 }: { s?: number }) => svg(s, <><circle cx="8" cy="8" r="6.5" /><path d="M6 6.2a2 2 0 1 1 3 1.7c-.7.4-1 .8-1 1.5M8 11.7v.01" /></>, 1.8);
export const IconDoc = ({ s = 16 }: { s?: number }) => svg(s, <><path d="M4 1.5h5.5L12.5 4.5v10H4z" /><path d="M6.5 8H10M6.5 11H10" /></>, 1.5);
export const IconChevron = () => <span className="chev">{svg(16, <path d="m4 6 4 4 4-4" />, 1.8)}</span>;

export function VerdictIcon({ verdict, s = 16 }: { verdict: Verdict; s?: number }) {
  if (verdict === "request_changes") return <IconCross s={s} />;
  if (verdict === "needs_discussion") return <IconAsk s={s} />;
  return <IconCheck s={s} />;
}

const TOKEN = /(\/\/.*$|(?:^|\s)#\s.*$)|("[^"]*"|'[^']*'|`[^`]*`)|\b(async|await|const|let|var|return|if|else|for|in|def|func|function|export|class|import|from|new)\b|\b(\d+)\b/g;

/** Light highlighting built from React elements. Code from a PR is never treated as HTML. */
export function Highlight({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index;
    if (at > last) out.push(text.slice(last, at));
    const cls = m[1] ? "cm" : m[2] ? "st" : m[3] ? "k" : "nu";
    out.push(<span key={at} className={cls}>{m[0]}</span>);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out.length ? out : " "}</>;
}

export function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

export function Dialog({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) {
      d.showModal();
      // showModal focuses the first control, which isn't always the one to fill in first.
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
