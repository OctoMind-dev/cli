import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeepMockProxy, mock, mockDeep } from "vitest-mock-extended";

import { client } from "../../../src/tools/client";
import { getGitContext } from "../../../src/tools/sync/git";
import { push } from "../../../src/tools/sync/push";
import { readTestCasesFromDir } from "../../../src/tools/sync/yml";

vi.mock("../../../src/tools/sync/git");
vi.mock("../../../src/tools/sync/yml");

describe("push", () => {
  let mockedClient: DeepMockProxy<typeof client>;

  beforeEach(() => {
    vi.mocked(getGitContext).mockResolvedValue({
      defaultBranch: "refs/heads/main",
      ref: "refs/heads/main",
      repo: "my-repo",
      owner: "my-org",
      sha: "sha256-12123as",
    });

    vi.mocked(readTestCasesFromDir).mockReturnValue([]);
    console.log = vi.fn();
    mockedClient = mockDeep();
    vi.mocked(mockedClient.POST).mockResolvedValue({
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

    await push({
      testTargetId: "someId",
      sourceDir: ".",
      client: mockedClient,
      onError: vi.fn(),
    });

    expect(mockedClient.POST).toHaveBeenCalledWith(
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

    await push({
      testTargetId: "someId",
      sourceDir: ".",
      client: mockedClient,
      onError: vi.fn(),
    });

    expect(mockedClient.POST).toHaveBeenCalledWith(
      "/apiKey/beta/test-targets/{testTargetId}/draft/push",
      expect.anything(),
    );
  });

  it("pushes to draft if no git context", async () => {
    vi.mocked(getGitContext).mockResolvedValue(undefined);

    await push({
      testTargetId: "someId",
      sourceDir: ".",
      client: mockedClient,
      onError: vi.fn(),
    });

    expect(mockedClient.POST).toHaveBeenCalledWith(
      "/apiKey/beta/test-targets/{testTargetId}/draft/push",
      expect.anything(),
    );
  });

  it("calls the handleError callback on error", async () => {
    vi.mocked(getGitContext).mockResolvedValue({
      defaultBranch: "refs/heads/main",
      ref: "refs/heads/different",
      repo: "my-repo",
      owner: "my-org",
      sha: "sha256-12123as",
    });

    vi.mocked(mockedClient.POST).mockResolvedValue({
      data: undefined,
      error: [mock()],
      response: mock(),
    });

    const handleError = vi.fn();
    await push({
      testTargetId: "someId",
      sourceDir: ".",
      client: mockedClient,
      onError: handleError,
    });

    expect(handleError).toHaveBeenCalled();
  });
});
