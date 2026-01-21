import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import { confirmAction, findOctomindFolder } from "../../src/helpers";
import { pushTestTarget } from "../../src/tools";
import { client } from "../../src/tools/client";
import { getGitContext } from "../../src/tools/sync/git";
import { readTestCasesFromDir } from "../../src/tools/sync/yaml";
import { mockLogger } from "../setup";

vi.mock("../../src/helpers");
vi.mock("../../src/tools/sync/git");
vi.mock("../../src/tools/sync/yaml");
vi.mock("../../src/tools/client");

describe("push", () => {
  beforeEach(() => {
    vi.mocked(findOctomindFolder).mockResolvedValue("/project/.octomind");
    vi.mocked(confirmAction).mockResolvedValue(true);
    vi.mocked(getGitContext).mockResolvedValue({
      defaultBranch: "refs/heads/main",
      ref: "refs/heads/main",
      repo: "my-repo",
      owner: "my-org",
      sha: "sha256-12123as",
    });

    vi.mocked(readTestCasesFromDir).mockReturnValue([]);
    vi.mocked(client).GET.mockResolvedValue({
      data: { id: "someId", app: "My Test App" },
      error: undefined,
      response: mock(),
    });
    vi.mocked(client).POST.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: mock(),
    });
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
      yes: true,
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
      yes: true,
    });

    expect(client.POST).toHaveBeenCalledWith(
      "/apiKey/beta/test-targets/{testTargetId}/draft/push",
      expect.anything(),
    );
  });

  describe("confirmation", () => {
    it("prompts for confirmation with test target name", async () => {
      const id = "someId";
      const name = "My Test App";
      vi.mocked(client).GET.mockResolvedValue({
        data: { id, app: name },
        error: undefined,
        response: mock(),
      });
      await pushTestTarget({
        testTargetId: "someId",
      });

      expect(confirmAction).toHaveBeenCalledWith(
        `Push local changes to test target "${name}" with id "${id}"?`,
      );
    });

    it("skips confirmation when --yes flag is provided", async () => {
      await pushTestTarget({
        testTargetId: "someId",
        yes: true,
      });

      expect(confirmAction).not.toHaveBeenCalled();
      expect(client.POST).toHaveBeenCalled();
    });

    it("does not push when user declines confirmation", async () => {
      vi.mocked(confirmAction).mockResolvedValue(false);

      await pushTestTarget({
        testTargetId: "someId",
      });

      expect(client.POST).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("Push cancelled.");
    });
  });
});
