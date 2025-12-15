import path from "path";

import { simpleGit } from "simple-git";

import { ExecutionContext } from "./types";

export const parseGitRemote = async (): Promise<{
  owner?: string;
  repo?: string;
}> => {
  try {
    const originUrl = await simpleGit().remote(["get-url", "origin"]);

    if (typeof originUrl !== "string") {
      return {};
    }
    const trimmed = originUrl.trim();
    // Support formats:
    // 1) git@github.com:owner/repo.git
    // 2) https://github.com/owner/repo.git
    // 3) https://github.com/owner/repo
    let m = trimmed.match(/^git@[^:]+:([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!m) {
      m = trimmed.match(/^https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?$/);
    }
    if (m) {
      const owner = m[1];
      const repo = m[2];
      return { owner, repo };
    }
    const revParse = await simpleGit().revparse(["--show-toplevel"]);
    return { repo: path.basename(revParse) };
  } catch (error) {
    console.error(error);
    return {};
  }
};

export type GitContext = ExecutionContext & {
  ref?: string;
  defaultBranch?: string;
};

export const getDefaultBranch = async (): Promise<string> => {
  const symbolicRef = (
    await simpleGit().raw("symbolic-ref", "refs/remotes/origin/HEAD")
  ).trim();
  return symbolicRef.replace("refs/remotes/origin/", "refs/heads/");
};

export const getGitContext = async (): Promise<GitContext | undefined> => {
  try {
    const branch = await simpleGit().revparse(["--abbrev-ref", "HEAD"]);
    const sha = await simpleGit().revparse(["HEAD"]);
    const { owner, repo } = await parseGitRemote();

    const defaultBranch = await getDefaultBranch();

    const ref = branch ? `refs/heads/${branch}` : undefined;

    const ctx: GitContext = {
      source: "github",
      sha,
      ref,
      repo,
      owner,
      defaultBranch,
    };
    return ctx;
  } catch {
    return undefined;
  }
};
