import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import { findOctomindFolder } from "../../src/helpers";
import { pushTestTarget } from "../../src/tools";
import { client } from "../../src/tools/client";
import { getGitContext } from "../../src/tools/sync/git";
import { readTestCasesFromDir } from "../../src/tools/sync/yaml";

vi.mock("../../src/helpers");
vi.mock("../../src/tools/sync/git");
vi.mock("../../src/tools/sync/yaml");
vi.mock("../../src/tools/client");

describe("push", () => {
  beforeEach(() => {
    vi.mocked(findOctomindFolder).mockResolvedValue("/project/.octomind");
    vi.mocked(getGitContext).mockResolvedValue({
      defaultBranch: "refs/heads/main",
      ref: "refs/heads/main",
      repo: "my-repo",
      owner: "my-org",
      sha: "sha256-12123as",
    });

    vi.mocked(readTestCasesFromDir).mockReturnValue([]);
    vi.mocked(client).POST.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: mock(),
    });
    console.log = vi.fn();
  });

  it("pushes to main if on default branch", async () => {
    vi.mocked(getGitContext).mockResolvedValue({
      defaultBranch: "refs/heads/main",
      ref: "refs/heads/main",
      repo: "my-repo",
      owner: "my-org",
      sha: "sha256-12123as",
    });

    await pushTestTarget({
      testTargetId: "someId",
    });

    expect(client.POST).toHaveBeenCalledWith(
      "/apiKey/beta/test-targets/{testTargetId}/push",
      expect.anything(),
    );
  });

  it("pushes to draft if on other branch", async () => {
    vi.mocked(getGitContext).mockResolvedValue({
      defaultBranch: "refs/heads/main",
      ref: "refs/heads/different",
      repo: "my-repo",
      owner: "my-org",
      sha: "sha256-12123as",
    });

    await pushTestTarget({
      testTargetId: "someId",
    });

    expect(client.POST).toHaveBeenCalledWith(
      "/apiKey/beta/test-targets/{testTargetId}/draft/push",
      expect.anything(),
    );
  });
});
