import path from "path";

import { simpleGit } from "simple-git";

import { ExecutionContext } from "./types";

export const parseGitRemote = async (): Promise<{
  owner?: string;
  repo?: string;
}> => {
  try {
    const originUrl = await simpleGit().remote(["get-url, origin"]);

    if (typeof originUrl !== "string") {
      return {};
    }
    // Support formats:
    // 1) git@github.com:owner/repo.git
    // 2) https://github.com/owner/repo.git
    // 3) https://github.com/owner/repo
    let m = originUrl.match(/^git@[^:]+:([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!m) {
      m = originUrl.match(/^https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?$/);
    }
    if (m) {
      const owner = m[1];
      const repo = m[2];
      return { owner, repo };
    }
    const revParse = await simpleGit().revparse(["--show-toplevel"]);
    return { repo: path.basename(revParse) };
  } catch {
    return {};
  }
};

export type GitContext = ExecutionContext & {
  ref?: string;
  defaultBranch?: string;
};

export const getGitContext = async (): Promise<GitContext | undefined> => {
  try {
    const branch = await simpleGit().revparse(["--abbrev-ref", "HEAD"]);
    const sha = await simpleGit().revparse(["HEAD"]);

    const { owner, repo } = await parseGitRemote();
    const ref = branch ? `refs/heads/${branch}` : undefined;

    const ctx: GitContext = {
      source: "github",
      sha,
      ref,
      repo,
      owner,
    };
    return ctx;
  } catch {
    return undefined;
  }
};
