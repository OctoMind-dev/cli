import fs from "fs";

import ora from "ora";
import { beforeEach, describe, expect, it, MockedObject, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import yaml from "yaml";

import {
  findOctomindFolder,
  getAbsoluteFilePathInOctomindRoot,
} from "../../../src/helpers";
import { client } from "../../../src/tools/client";
import { draftPush } from "../../../src/tools/sync/push";
import { readTestCasesFromDir } from "../../../src/tools/sync/yml";
import { edit } from "../../../src/tools/yamlMutations/edit";
import { waitForLocalChangesToBeFinished } from "../../../src/tools/yamlMutations/waitForLocalChanges";
import { createMockSyncTestCase } from "../../mocks";

vi.mock("fs");
vi.mock("open");
vi.mock("../../../src/helpers");
vi.mock("../../../src/tools/client");
vi.mock("../../../src/tools/sync/push");
vi.mock("../../../src/tools/sync/yml");
vi.mock("../../../src/tools/sync/consistency");
vi.mock("../../../src/tools/yamlMutations/waitForLocalChanges");

describe("edit", () => {
  let mockedClient: MockedObject<typeof client>;

  beforeEach(() => {
    console.log = vi.fn();

    mockedClient = vi.mocked(client);

    vi.mocked(waitForLocalChangesToBeFinished).mockResolvedValue(
      createMockSyncTestCase({ id: "test-id" }),
    );

    vi.mocked(readTestCasesFromDir).mockReturnValue([]);
  });

  it("throws if octomind folder is not found", async () => {
    vi.mocked(findOctomindFolder).mockResolvedValue(null);

    await expect(
      edit({ testTargetId: "someId", filePath: "test.yaml" }),
    ).rejects.toThrow("Could not find .octomind folder");
  });

  it("throws if file path is not found", async () => {
    vi.mocked(findOctomindFolder).mockResolvedValue("/mock/.octomind");
    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(null);

    await expect(
      edit({ testTargetId: "someId", filePath: "missing.yaml" }),
    ).rejects.toThrow("Could not find missing.yaml");
  });

  it("throws if test case file cannot be parsed", async () => {
    vi.mocked(findOctomindFolder).mockResolvedValue("/mock/.octomind");
    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(
      "/mock/.octomind/test.yaml",
    );
    vi.mocked(fs.readFileSync).mockReturnValue("this: is: invalid: ");

    await expect(
      edit({ testTargetId: "someId", filePath: "test.yaml" }),
    ).rejects.toThrow("Could not parse");
  });

  it("throws if draftPush returns no response", async () => {
    const testCase = createMockSyncTestCase({ id: "test-id" });

    vi.mocked(findOctomindFolder).mockResolvedValue("/mock/.octomind");
    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(
      "/mock/.octomind/test.yaml",
    );
    vi.mocked(fs.readFileSync).mockReturnValue(yaml.stringify(testCase));
    vi.mocked(readTestCasesFromDir).mockReturnValue([testCase]);
    vi.mocked(draftPush).mockResolvedValue(undefined);

    await expect(
      edit({ testTargetId: "someId", filePath: "test.yaml" }),
    ).rejects.toThrow("Could not edit test case with id 'test-id'");
  });

  it("throws if versionId is not returned for test case", async () => {
    const testCase = createMockSyncTestCase({ id: "test-id" });

    vi.mocked(findOctomindFolder).mockResolvedValue("/mock/.octomind");
    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(
      "/mock/.octomind/test.yaml",
    );
    vi.mocked(fs.readFileSync).mockReturnValue(yaml.stringify(testCase));
    vi.mocked(readTestCasesFromDir).mockReturnValue([testCase]);
    vi.mocked(draftPush).mockResolvedValue({
      success: true,
      versionIds: [],
      versionIdByStableId: {},
    });

    await expect(
      edit({ testTargetId: "someId", filePath: "test.yaml" }),
    ).rejects.toThrow("Could not edit test case with id 'test-id'");
  });

  it("exits gracefully when editing is cancelled", async () => {
    const testCase = createMockSyncTestCase({ id: "test-id" });

    vi.mocked(findOctomindFolder).mockResolvedValue("/mock/.octomind");
    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(
      "/mock/.octomind/test.yaml",
    );
    vi.mocked(fs.readFileSync).mockReturnValue(yaml.stringify(testCase));
    vi.mocked(readTestCasesFromDir).mockReturnValue([testCase]);
    vi.mocked(draftPush).mockResolvedValue({
      success: true,
      versionIds: [],
      versionIdByStableId: { "test-id": "version-123" },
    });
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
    vi.mocked(waitForLocalChangesToBeFinished).mockResolvedValue("cancelled");

    await edit({ testTargetId: "someId", filePath: "test.yaml" });

    expect(console.log).toHaveBeenCalledWith(
      "Cancelled editing test case, exiting",
    );
  });

  it("includes dependency chain in relevant test cases", async () => {
    const parentTestCase = createMockSyncTestCase({ id: "parent-id" });
    const childTestCase = createMockSyncTestCase({
      id: "child-id",
      dependencyId: "parent-id",
    });

    vi.mocked(findOctomindFolder).mockResolvedValue("/mock/.octomind");
    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(
      "/mock/.octomind/child.yaml",
    );
    vi.mocked(fs.readFileSync).mockReturnValue(yaml.stringify(childTestCase));
    vi.mocked(readTestCasesFromDir).mockReturnValue([
      parentTestCase,
      childTestCase,
    ]);
    vi.mocked(draftPush).mockResolvedValue({
      success: true,
      versionIds: [],
      versionIdByStableId: { "child-id": "version-123" },
    });
    vi.mocked(mockedClient.GET).mockResolvedValue({
      data: { localEditingStatus: "CANCELLED" },
      error: undefined,
      response: mock(),
    });

    await edit({ testTargetId: "someId", filePath: "child.yaml" });

    expect(draftPush).toHaveBeenCalledWith(
      expect.objectContaining({
        testCases: expect.arrayContaining([
          expect.objectContaining({ id: "child-id" }),
          expect.objectContaining({ id: "parent-id" }),
        ]),
      }),
      expect.anything(),
    );
  });

  it("throws if dependency is not found", async () => {
    const childTestCase = createMockSyncTestCase({
      id: "child-id",
      dependencyId: "missing-parent",
    });

    vi.mocked(findOctomindFolder).mockResolvedValue("/mock/.octomind");
    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(
      "/mock/.octomind/child.yaml",
    );
    vi.mocked(fs.readFileSync).mockReturnValue(yaml.stringify(childTestCase));
    vi.mocked(readTestCasesFromDir).mockReturnValue([childTestCase]);

    await expect(
      edit({ testTargetId: "someId", filePath: "child.yaml" }),
    ).rejects.toThrow("Could not find dependency missing-parent");
  });

  it("exits gracefully when editing is finished", async () => {
    const testCase = createMockSyncTestCase({ id: "test-id" });

    vi.mocked(findOctomindFolder).mockResolvedValue("/mock/.octomind");
    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(
      "/mock/.octomind/test.yaml",
    );
    vi.mocked(fs.readFileSync).mockReturnValue(yaml.stringify(testCase));
    vi.mocked(readTestCasesFromDir).mockReturnValue([testCase]);
    vi.mocked(draftPush).mockResolvedValue({
      success: true,
      versionIds: [],
      versionIdByStableId: { "test-id": "version-123" },
    });
    vi.mocked(mockedClient.GET)
      .mockResolvedValueOnce({
        data: { localEditingStatus: "IN_PROGRESS" },
        error: undefined,
        response: mock(),
      })
      .mockResolvedValueOnce({
        data: { localEditingStatus: "DONE" },
        error: undefined,
        response: mock(),
      });

    await edit({ testTargetId: "someId", filePath: "test.yaml" });

    expect(console.log).toHaveBeenCalledWith("Edited test case successfully");
  });
});
