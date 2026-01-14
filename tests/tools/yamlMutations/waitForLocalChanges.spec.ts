import { Client } from "openapi-fetch";
import ora from "ora";
import { beforeEach, describe, expect, it, MockedObject, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import { sleep } from "../../../src/helpers";
import { client, paths } from "../../../src/tools/client";
import { SyncTestCase } from "../../../src/tools/sync/types";
import { waitForLocalChangesToBeFinished } from "../../../src/tools/yamlMutations/waitForLocalChanges";
import { createMockSyncTestCase } from "../../mocks";

vi.mock("ora");
vi.mock("../../../src/helpers");
vi.mock("../../../src/tools/client");

describe("waitForLocalChangesToBeFinished", () => {
  let mockedClient: MockedObject<Client<paths, `${string}/${string}`>>;
  let mockedOraInstance: MockedObject<ReturnType<typeof ora>>;

  beforeEach(() => {
    mockedClient = vi.mocked(client);

    mockedOraInstance = mock<ReturnType<typeof ora>>({
      start: vi.fn().mockReturnThis(),
      succeed: vi.fn(),
      fail: vi.fn(),
    });
    vi.mocked(ora).mockReturnValue(mockedOraInstance);

    vi.mocked(sleep).mockResolvedValue();
  });

  it("throws if initial GET returns no data", async () => {
    const testCase = createMockSyncTestCase({ id: "test-id" });

    vi.mocked(mockedClient.GET).mockResolvedValueOnce({
      data: undefined,
      error: { message: "error" },
      response: mock(),
    });

    await expect(
      waitForLocalChangesToBeFinished("version-123", testCase, {
        testTargetId: "someId",
      }),
    ).rejects.toThrow(
      "Could not get local editing status for test case test-id",
    );
  });

  it("throws if GET returns no data during polling", async () => {
    const testCase = createMockSyncTestCase({ id: "test-id" });

    vi.mocked(mockedClient.GET)
      .mockResolvedValueOnce({
        data: { localEditingStatus: "IN_PROGRESS" },
        error: undefined,
        response: mock(),
      })
      .mockResolvedValueOnce({
        data: undefined,
        error: { message: "error" },
        response: mock(),
      });

    await expect(
      waitForLocalChangesToBeFinished("version-123", testCase, {
        testTargetId: "someId",
      }),
    ).rejects.toThrow(
      "Could not get local editing status for test case test-id",
    );
  });

  it("returns 'cancelled' when localEditingStatus is CANCELLED", async () => {
    const testCase = createMockSyncTestCase({ id: "test-id" });

    vi.mocked(mockedClient.GET)
      .mockResolvedValueOnce({
        data: { localEditingStatus: "IN_PROGRESS" },
        error: undefined,
        response: mock(),
      })
      .mockResolvedValueOnce({
        data: { localEditingStatus: "CANCELLED" },
        error: undefined,
        response: mock(),
      });

    const result = await waitForLocalChangesToBeFinished(
      "version-123",
      testCase,
      {
        testTargetId: "someId",
      },
    );

    expect(result).toBe("cancelled");
    expect(mockedOraInstance.fail).toHaveBeenCalledWith("cancelled by user");
  });

  it("returns updated test case when editing is finished", async () => {
    const testCase = createMockSyncTestCase({ id: "test-id" });

    vi.mocked(mockedClient.GET).mockResolvedValueOnce({
      data: {
        localEditingStatus: "DONE",
        description: "updated description",
        elements: [],
        version: "1",
        prompt: "updated prompt",
        runStatus: "ON",
      },
      error: undefined,
      response: mock(),
    });

    const result = await waitForLocalChangesToBeFinished(
      "version-123",
      testCase,
      {
        testTargetId: "someId",
      },
    );

    expect(result).toHaveProperty("versionId", undefined);
    expect(result).toHaveProperty("localEditingStatus", undefined);
    expect(result).toEqual<SyncTestCase>({
      id: "test-id",
      description: "updated description",
      elements: [],
      version: "1",
      prompt: "updated prompt",
      runStatus: "ON",
    });
    expect(mockedOraInstance.succeed).toHaveBeenCalledWith(
      "Finished editing in UI",
    );
  });

  it("polls until editing is finished", async () => {
    const testCase = createMockSyncTestCase({ id: "test-id" });

    vi.mocked(mockedClient.GET)
      .mockResolvedValueOnce({
        data: { localEditingStatus: "IN_PROGRESS" },
        error: undefined,
        response: mock(),
      })
      .mockResolvedValueOnce({
        data: { localEditingStatus: "IN_PROGRESS" },
        error: undefined,
        response: mock(),
      })
      .mockResolvedValueOnce({
        data: {
          localEditingStatus: "DONE",
          description: "done",
          elements: [],
          version: "1",
          prompt: "prompt",
          runStatus: "ON",
        },
        error: undefined,
        response: mock(),
      });

    await waitForLocalChangesToBeFinished("version-123", testCase, {
      testTargetId: "someId",
    });

    expect(sleep).toHaveBeenCalledTimes(2);
    expect(mockedClient.GET).toHaveBeenCalledTimes(3);
  });
});
