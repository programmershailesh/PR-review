import type { ProviderId } from "./types";

export interface PrLink {
  /** The service the link's shape belongs to. The connected account for the host has the final say. */
  provider: ProviderId;
  host: string;
  repo: string;
  number: number;
}

export type PrLinkResult = PrLink | { error: string };

const NUMBER = /^\d{1,9}$/;

/**
 * Reads a pull request or merge request link, such as
 * https://github.com/owner/repo/pull/12/files or gitlab.example.com/group/sub/project/-/merge_requests/7.
 */
export function parsePrLink(input: string): PrLinkResult {
  const text = input.trim();
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { error: "Paste the full link to a pull request or merge request." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { error: "Paste the full link to a pull request or merge request." };
  }
  const host = url.host.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean).map((p) => decodeURIComponent(p));

  const dash = parts.indexOf("-");
  if (dash >= 2 && parts[dash + 1] === "merge_requests" && NUMBER.test(parts[dash + 2] ?? "")) {
    return { provider: "gitlab", host, repo: parts.slice(0, dash).join("/"), number: Number(parts[dash + 2]) };
  }
  if (parts.length >= 4 && parts[2] === "pull" && NUMBER.test(parts[3] ?? "")) {
    return { provider: "github", host, repo: `${parts[0]}/${parts[1]}`, number: Number(parts[3]) };
  }
  if (parts.length >= 4 && parts[2] === "pull-requests") {
    return { error: "Bitbucket links aren't supported yet." };
  }
  return { error: "This doesn't look like a link to a pull request or merge request." };
}
