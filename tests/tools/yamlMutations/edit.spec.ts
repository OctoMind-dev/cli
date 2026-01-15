import fs from "fs";

import open from "open";
import { beforeEach, describe, expect, it, vi } from "vitest";
import yaml from "yaml";

import {
  findOctomindFolder,
  getAbsoluteFilePathInOctomindRoot,
} from "../../../src/helpers";
import { draftPush } from "../../../src/tools/sync/push";
import { readTestCasesFromDir } from "../../../src/tools/sync/yaml";
import { edit } from "../../../src/tools/yamlMutations/edit";
import { waitForLocalChangesToBeFinished } from "../../../src/tools/yamlMutations/waitForLocalChanges";
import {
  createMockDraftPushResponse,
  createMockSyncTestCase,
} from "../../mocks";

vi.mock("fs");
vi.mock("open");
vi.mock("../../../src/helpers");
vi.mock("../../../src/tools/client");
vi.mock("../../../src/tools/sync/push");
vi.mock("../../../src/tools/sync/yaml");
vi.mock("../../../src/tools/sync/consistency");
vi.mock("../../../src/tools/yamlMutations/waitForLocalChanges");

describe("edit", () => {
  const testCase = createMockSyncTestCase({ id: "test-id" });

  beforeEach(() => {
    console.log = vi.fn();

    vi.mocked(findOctomindFolder).mockResolvedValue("/mock/.octomind");
    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(
      "/mock/.octomind/test.yaml",
    );
    vi.mocked(fs.readFileSync).mockReturnValue(yaml.stringify(testCase));
    vi.mocked(readTestCasesFromDir).mockReturnValue([testCase]);
    vi.mocked(waitForLocalChangesToBeFinished).mockResolvedValue(
      createMockSyncTestCase({ id: "test-id" }),
    );
  });

  it("throws if octomind folder is not found", async () => {
    vi.mocked(findOctomindFolder).mockResolvedValue(null);

    await expect(
      edit({ testTargetId: "someId", filePath: "test.yaml" }),
    ).rejects.toThrow("Could not find .octomind folder");
  });

  it("throws if file path is not found", async () => {
    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(null);

    await expect(
      edit({ testTargetId: "someId", filePath: "missing.yaml" }),
    ).rejects.toThrow("Could not find missing.yaml");
  });

  it("throws if test case file cannot be parsed", async () => {
    vi.mocked(fs.readFileSync).mockReturnValue("this: is: invalid: ");

    await expect(
      edit({ testTargetId: "someId", filePath: "test.yaml" }),
    ).rejects.toThrow("Could not parse");
  });

  it("throws if draftPush returns no response", async () => {
    vi.mocked(draftPush).mockResolvedValue(undefined);

    await expect(
      edit({ testTargetId: "someId", filePath: "test.yaml" }),
    ).rejects.toThrow("Could not edit test case with id 'test-id'");
  });

  it("throws if versionId is not returned for test case", async () => {
    vi.mocked(draftPush).mockResolvedValue({
      success: true,
      versionIds: [],
      syncDataByStableId: {},
    });

    await expect(
      edit({ testTargetId: "someId", filePath: "test.yaml" }),
    ).rejects.toThrow("Could not edit test case with id 'test-id'");
  });

  it("exits gracefully when editing is cancelled", async () => {
    vi.mocked(draftPush).mockResolvedValue(
      createMockDraftPushResponse("test-id"),
    );
    vi.mocked(waitForLocalChangesToBeFinished).mockResolvedValue("cancelled");

    await edit({ testTargetId: "someId", filePath: "test.yaml" });

    expect(console.log).toHaveBeenCalledWith(
      "Cancelled editing test case, exiting",
    );
  });

  it("exits gracefully when editing is finished", async () => {
    vi.mocked(draftPush).mockResolvedValue(
      createMockDraftPushResponse("test-id"),
    );

    await edit({ testTargetId: "someId", filePath: "test.yaml" });

    expect(console.log).toHaveBeenCalledWith("Edited test case successfully");
  });

  it.each([
    {
      testResultId: "result-456",
      expectedUrl: expect.stringContaining("testResultId=result-456"),
    },
    {
      testResultId: undefined,
      expectedUrl: expect.not.stringContaining("testResultId"),
    },
  ])("handles testResultId=$testResultId in URL correctly", async ({
    testResultId,
    expectedUrl,
  }) => {
    vi.mocked(draftPush).mockResolvedValue(
      createMockDraftPushResponse("test-id", { testResultId }),
    );
    vi.mocked(waitForLocalChangesToBeFinished).mockResolvedValue("cancelled");

    await edit({ testTargetId: "someId", filePath: "test.yaml" });

    expect(open).toHaveBeenCalledWith(expectedUrl);
  });
});
