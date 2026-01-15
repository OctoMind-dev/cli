import fs from "fs";

import open from "open";
import { beforeEach, describe, expect, it, vi } from "vitest";
import yaml from "yaml";

import {
  findOctomindFolder,
  getAbsoluteFilePathInOctomindRoot,
} from "../../../src/helpers";
import { draftPush } from "../../../src/tools/sync/push";
import {
  buildFilename,
  buildFolderName,
  readTestCasesFromDir,
  writeSingleTestCaseYaml,
} from "../../../src/tools/sync/yaml";
import { create } from "../../../src/tools/yamlMutations/create";
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

describe("create", () => {
  beforeEach(() => {
    console.log = vi.fn();

    vi.mocked(findOctomindFolder).mockResolvedValue("/mock/.octomind");
    vi.mocked(waitForLocalChangesToBeFinished).mockResolvedValue(
      createMockSyncTestCase({ id: "test-id" }),
    );

    vi.mocked(readTestCasesFromDir).mockReturnValue([]);
    vi.mocked(buildFolderName).mockReturnValue("/mock/.octomind");
    vi.mocked(buildFilename).mockReturnValue("new-test.yaml");
  });

  it("throws if octomind folder is not found", async () => {
    vi.mocked(findOctomindFolder).mockResolvedValue(null);

    await expect(
      create({ testTargetId: "someId", name: "Test Name" }),
    ).rejects.toThrow("Could not find .octomind folder");
  });

  it("throws if dependency path is not found", async () => {
    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(null);

    await expect(
      create({
        testTargetId: "someId",
        name: "Test Name",
        dependencyPath: "missing.yaml",
      }),
    ).rejects.toThrow("Could not find dependency test case missing.yaml");
  });

  it("throws if dependency test case file cannot be parsed", async () => {
    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(
      "/mock/.octomind/dependency.yaml",
    );
    vi.mocked(fs.readFileSync).mockReturnValue("this: is: invalid: ");

    await expect(
      create({
        testTargetId: "someId",
        name: "Test Name",
        dependencyPath: "dependency.yaml",
      }),
    ).rejects.toThrow("Could not parse");
  });

  it("throws if draftPush returns no response", async () => {
    vi.mocked(draftPush).mockResolvedValue(undefined);

    await expect(
      create({ testTargetId: "someId", name: "Test Name" }),
    ).rejects.toThrow("Could not create new test case");
  });

  it("throws if versionId is not returned for test case", async () => {
    vi.mocked(draftPush).mockResolvedValue({
      success: true,
      versionIds: [],
      syncDataByStableId: {},
    });

    await expect(
      create({ testTargetId: "someId", name: "Test Name" }),
    ).rejects.toThrow("Could not create test case");
  });

  it("exits gracefully when creation is cancelled", async () => {
    vi.mocked(draftPush).mockImplementation(async ({ testCases }) =>
      createMockDraftPushResponse(testCases[0].id),
    );
    vi.mocked(waitForLocalChangesToBeFinished).mockResolvedValue("cancelled");

    await create({ testTargetId: "someId", name: "Test Name" });

    expect(console.log).toHaveBeenCalledWith(
      "Cancelled editing test case, exiting",
    );
  });

  it("exits gracefully when creation is finished", async () => {
    vi.mocked(draftPush).mockImplementation(async ({ testCases }) =>
      createMockDraftPushResponse(testCases[0].id),
    );

    await create({ testTargetId: "someId", name: "Test Name" });

    expect(console.log).toHaveBeenCalledWith("Edited test case successfully");
    expect(writeSingleTestCaseYaml).toHaveBeenCalledWith(
      "/mock/.octomind/new-test.yaml",
      expect.objectContaining({ id: "test-id" }),
    );
  });

  it("creates test case with correct properties", async () => {
    vi.mocked(draftPush).mockImplementation(async ({ testCases }) => {
      const newTestCase = testCases[0];
      expect(newTestCase).toMatchObject({
        version: "1",
        description: "My New Test",
        runStatus: "OFF",
        localEditingStatus: "IN_PROGRESS",
        elements: [],
        prompt: "",
      });
      expect(newTestCase.id).toBeDefined();
      expect(newTestCase.dependencyId).toBeUndefined();
      return {
        success: true,
        versionIds: [],
        syncDataByStableId: { [newTestCase.id]: { versionId: "version-123" } },
      };
    });

    await create({ testTargetId: "someId", name: "My New Test" });
  });

  it("includes dependency when dependencyPath is provided", async () => {
    const dependencyTestCase = createMockSyncTestCase({ id: "dependency-id" });

    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(
      "/mock/.octomind/dependency.yaml",
    );
    vi.mocked(fs.readFileSync).mockReturnValue(
      yaml.stringify(dependencyTestCase),
    );
    vi.mocked(readTestCasesFromDir).mockReturnValue([dependencyTestCase]);
    vi.mocked(draftPush).mockImplementation(async ({ testCases }) => {
      const newTestCase = testCases.find(
        (tc) => tc.dependencyId === "dependency-id",
      );
      expect(newTestCase).toBeDefined();
      expect(newTestCase?.dependencyId).toBe("dependency-id");
      const id = newTestCase?.id ?? "fallback";
      return {
        success: true,
        versionIds: [],
        syncDataByStableId: { [id]: { versionId: "version-123" } },
      };
    });

    await create({
      testTargetId: "someId",
      name: "Test With Dependency",
      dependencyPath: "dependency.yaml",
    });
  });

  it("opens browser with correct URL", async () => {
    vi.mocked(draftPush).mockImplementation(async ({ testCases }) =>
      createMockDraftPushResponse(testCases[0].id),
    );

    await create({ testTargetId: "someId", name: "Test Name" });

    expect(open).toHaveBeenCalledWith(
      expect.stringContaining(
        "/testtargets/someId/testcases/version-123/localEdit",
      ),
    );
  });
});
