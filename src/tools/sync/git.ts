import path from "path";

import { simpleGit } from "simple-git";

import { logger } from "../../logger";
import { ExecutionContext } from "./types";

const FALLBACK_DEFAULT_BRANCH = "refs/heads/main";

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
    logger.error({ err: error }, "Failed to parse git remote");
    return {};
  }
};

export type GitContext = ExecutionContext & {
  ref?: string;
  defaultBranch?: string;
};

export const getDefaultBranch = async (
  allowedMethod: "symbolicRef+origin" | "origin" = "symbolicRef+origin",
): Promise<string> => {
  if (allowedMethod === "symbolicRef+origin") {
    try {
      const symbolicRef = (
        await simpleGit().raw("symbolic-ref", "refs/remotes/origin/HEAD")
      ).trim();
      const symbolicRefBranch = symbolicRef.replace(
        "refs/remotes/origin/",
        "refs/heads/",
      );
      if (symbolicRefBranch) {
        return symbolicRefBranch;
      }
    } catch (e) {
      logger.warn(
        { err: e },
        "could not identify symbolic ref, falling back to origin parsing",
      );
    }
  }

  try {
    const origin = await simpleGit().remote(["show", "origin"]);
    if (!origin) {
      logger.warn("could not identify default branch, falling back to 'main'");
      return FALLBACK_DEFAULT_BRANCH;
    }

    const originDefaultBranch = /HEAD branch:(<branchName>(.*))/.exec(origin);

    return originDefaultBranch?.groups?.["branchName"]
      ? `refs/heads/${originDefaultBranch?.groups?.["branchName"]}`
      : FALLBACK_DEFAULT_BRANCH;
  } catch (e) {
    logger.warn(
      { err: e },
      "could not identify default branch, falling back to 'main'",
    );
  }

  return FALLBACK_DEFAULT_BRANCH;
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
  } catch (e) {
    logger.warn(
      { err: e },
      "could not identify git context, falling back to undefined",
    );
    return undefined;
  }
};
