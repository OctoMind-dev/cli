import { SimpleGit, SimpleGitFactory, simpleGit } from "simple-git";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { MockProxy, mock } from "vitest-mock-extended";

import {
  getDefaultBranch,
  getGitContext,
  parseGitRemote,
} from "../../../src/tools/sync/git";

vi.mock("simple-git");

describe("git", () => {
  let mockGit: MockProxy<SimpleGit>;

  beforeEach(() => {
    mockGit = mock<SimpleGit>();
    vi.mocked(simpleGit).mockReturnValue(mockGit);
    mockGit.raw.mockResolvedValue("refs/remotes/origin/main");
    console.error = vi.fn();
  });

  describe("getDefaultBranch", () => {
    it("should fallback if both origin and symbolic ref fail", async () => {
      console.warn = vi.fn();
      mockGit.raw.mockResolvedValue("");
      mockGit.remote.mockResolvedValue("");

      const defaultBranch = await getDefaultBranch();

      expect(defaultBranch).toEqual("refs/heads/main");
      expect(console.warn).toHaveBeenCalled();
    });

    it("should fallback if both origin and symbolic ref do not return anything and origin throws", async () => {
      console.warn = vi.fn();
      mockGit.raw.mockResolvedValue("");
      mockGit.remote.mockRejectedValue("");

      const defaultBranch = await getDefaultBranch();

      expect(defaultBranch).toEqual("refs/heads/main");
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe("parseGitRemote", () => {
    it("parses SSH git remote format (git@github.com:owner/repo.git)", async () => {
      mockGit.remote.mockResolvedValue("git@github.com:my-org/my-repo.git");

      const result = await parseGitRemote();

      expect(result).toEqual({ owner: "my-org", repo: "my-repo" });
    });

    it("parses SSH git remote format without .git suffix", async () => {
      mockGit.remote.mockResolvedValue("git@github.com:owner/repo");

      const result = await parseGitRemote();

      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("parses HTTPS git remote format (https://github.com/owner/repo.git)", async () => {
      mockGit.remote.mockResolvedValue("https://github.com/my-org/my-repo.git");

      const result = await parseGitRemote();

      expect(result).toEqual({ owner: "my-org", repo: "my-repo" });
    });

    it("parses HTTPS git remote format without .git suffix", async () => {
      mockGit.remote.mockResolvedValue("https://github.com/owner/repo");

      const result = await parseGitRemote();

      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("parses HTTP git remote format", async () => {
      mockGit.remote.mockResolvedValue("http://github.com/owner/repo.git");

      const result = await parseGitRemote();

      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("returns empty object when remote is not a string", async () => {
      mockGit.remote.mockResolvedValue(undefined);

      const result = await parseGitRemote();

      expect(result).toEqual({});
    });

    it("falls back to revparse when remote URL does not match expected format", async () => {
      mockGit.remote.mockResolvedValue("some-unsupported-format");
      mockGit.revparse.mockResolvedValue("/home/user/my-project");

      const result = await parseGitRemote();

      expect(result).toEqual({ repo: "my-project" });
      expect(mockGit.revparse).toHaveBeenCalledWith(["--show-toplevel"]);
    });

    it("returns empty object when simpleGit throws an error", async () => {
      mockGit.remote.mockRejectedValue(new Error("git not found"));

      const result = await parseGitRemote();

      expect(result).toEqual({});
    });
  });

  describe("getGitContext", () => {
    it("returns full git context with branch, sha, owner and repo", async () => {
      mockGit.revparse
        .mockResolvedValueOnce("main")
        .mockResolvedValueOnce("abc123def456");
      mockGit.remote.mockResolvedValue("git@github.com:my-org/my-repo.git");

      const result = await getGitContext();

      expect(result).toEqual({
        source: "github",
        sha: "abc123def456",
        ref: "refs/heads/main",
        repo: "my-repo",
        owner: "my-org",
        defaultBranch: "refs/heads/main",
      });
    });

    it("returns context without ref when branch is empty", async () => {
      mockGit.revparse
        .mockResolvedValueOnce("")
        .mockResolvedValueOnce("abc123def456");
      mockGit.remote.mockResolvedValue("git@github.com:my-org/my-repo.git");

      const result = await getGitContext();

      expect(result).toEqual({
        source: "github",
        sha: "abc123def456",
        ref: undefined,
        repo: "my-repo",
        owner: "my-org",
        defaultBranch: "refs/heads/main",
      });
    });

    it("returns context with only repo when remote parsing fails to match", async () => {
      mockGit.revparse
        .mockResolvedValueOnce("feature-branch")
        .mockResolvedValueOnce("def789")
        .mockResolvedValueOnce("/path/to/project-name");
      mockGit.remote.mockResolvedValue("unsupported-format");

      const result = await getGitContext();

      expect(result).toEqual({
        source: "github",
        sha: "def789",
        ref: "refs/heads/feature-branch",
        repo: "project-name",
        owner: undefined,
        defaultBranch: "refs/heads/main",
      });
    });

    it("returns undefined when simpleGit throws an error", async () => {
      mockGit.revparse.mockRejectedValue(new Error("not a git repository"));

      const result = await getGitContext();

      expect(result).toBeUndefined();
    });
  });
});
