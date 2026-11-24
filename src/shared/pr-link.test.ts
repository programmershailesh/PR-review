import { describe, expect, it } from "vitest";
import { parsePrLink } from "./pr-link";

describe("parsePrLink", () => {
  it("reads GitHub and GitHub Enterprise links, ignoring extra parts", () => {
    expect(parsePrLink("https://github.com/o/r/pull/12")).toEqual({ provider: "github", host: "github.com", repo: "o/r", number: 12 });
    expect(parsePrLink("  https://GitHub.com/o/r/pull/12/files#diff-1  ")).toEqual({ provider: "github", host: "github.com", repo: "o/r", number: 12 });
    expect(parsePrLink("git.corp.example:8443/team/app/pull/7?w=1")).toEqual({ provider: "github", host: "git.corp.example:8443", repo: "team/app", number: 7 });
  });

  it("reads GitLab links, including nested groups and self-hosted servers", () => {
    expect(parsePrLink("https://gitlab.com/g/sub/proj/-/merge_requests/57/diffs")).toEqual({ provider: "gitlab", host: "gitlab.com", repo: "g/sub/proj", number: 57 });
    expect(parsePrLink("gitlab.example.com/a/b/-/merge_requests/3")).toEqual({ provider: "gitlab", host: "gitlab.example.com", repo: "a/b", number: 3 });
  });

  it("explains what it can't read", () => {
    expect(parsePrLink("not a link")).toEqual({ error: "Paste the full link to a pull request or merge request." });
    expect(parsePrLink("https://github.com/o/r/issues/3")).toHaveProperty("error", "This doesn't look like a link to a pull request or merge request.");
    expect(parsePrLink("https://github.com/o/r/pull/abc")).toHaveProperty("error");
    expect(parsePrLink("https://gitlab.com/-/merge_requests/3")).toHaveProperty("error");
    expect(parsePrLink("ftp://github.com/o/r/pull/1")).toHaveProperty("error");
    expect(parsePrLink("https://bitbucket.org/w/r/pull-requests/4")).toEqual({ error: "Bitbucket links aren't supported yet." });
  });
});
