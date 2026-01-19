import open from "open";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  findOctomindFolder,
  getAbsoluteFilePathInOctomindRoot,
} from "../../../src/helpers";
import { draftPush } from "../../../src/tools/sync/push";
import {
  buildFilename,
  buildFolderName,
  loadTestCase,
  readTestCasesFromDir,
  writeSingleTestCaseYaml,
} from "../../../src/tools/sync/yaml";
import { create } from "../../../src/tools/yamlMutations/create";
import { waitForLocalChangesToBeFinished } from "../../../src/tools/yamlMutations/waitForLocalChanges";
import {
  createMockDraftPushResponse,
  createMockSyncTestCase,
  mockLogger,
} from "../../mocks";

vi.mock("open");
vi.mock("../../../src/helpers");
vi.mock("../../../src/tools/client");
vi.mock("../../../src/tools/sync/push");
vi.mock("../../../src/tools/sync/yaml");
vi.mock("../../../src/tools/sync/consistency");
vi.mock("../../../src/tools/yamlMutations/waitForLocalChanges");

describe("create", () => {
  const GENERATED_TEST_ID = "00000000-0000-0000-0000-000000000000";

  beforeEach(() => {
    mockLogger.info.mockClear();

    vi.spyOn(crypto, "randomUUID").mockReturnValue(GENERATED_TEST_ID);
    vi.mocked(findOctomindFolder).mockResolvedValue("/mock/.octomind");
    vi.mocked(draftPush).mockResolvedValue(
      createMockDraftPushResponse(GENERATED_TEST_ID),
    );
    vi.mocked(waitForLocalChangesToBeFinished).mockResolvedValue(
      createMockSyncTestCase({ id: GENERATED_TEST_ID }),
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
    vi.mocked(loadTestCase).mockImplementation(() => {
      throw new Error("Could not parse /mock/.octomind/dependency.yaml");
    });

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
    vi.mocked(waitForLocalChangesToBeFinished).mockResolvedValue("cancelled");

    await create({ testTargetId: "someId", name: "Test Name" });

    expect(mockLogger.info).toHaveBeenCalledWith(
      "Cancelled editing test case, exiting",
    );
  });

  it("exits gracefully when creation is finished", async () => {
    await create({ testTargetId: "someId", name: "Test Name" });

    expect(mockLogger.info).toHaveBeenCalledWith("Created test case successfully");
    expect(writeSingleTestCaseYaml).toHaveBeenCalledWith(
      "/mock/.octomind/new-test.yaml",
      expect.objectContaining({ id: GENERATED_TEST_ID }),
    );
  });

  it("creates test case with correct properties", async () => {
    await create({ testTargetId: "someId", name: "My New Test" });

    expect(draftPush).toHaveBeenCalledWith(
      {
        testCases: [
          expect.objectContaining({
            id: GENERATED_TEST_ID,
            version: "1",
            description: "My New Test",
            runStatus: "OFF",
            localEditingStatus: "IN_PROGRESS",
            elements: [],
            prompt: "",
            dependencyId: undefined,
          }),
        ],
      },
      expect.anything(),
    );
  });

  it("includes dependency when dependencyPath is provided", async () => {
    const dependencyId = "dependency-id";
    const dependencyTestCase = createMockSyncTestCase({ id: dependencyId });

    vi.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(
      "/mock/.octomind/dependency.yaml",
    );
    vi.mocked(loadTestCase).mockReturnValue(dependencyTestCase);
    vi.mocked(readTestCasesFromDir).mockReturnValue([dependencyTestCase]);

    await create({
      testTargetId: "someId",
      name: "Test With Dependency",
      dependencyPath: "dependency.yaml",
    });

    expect(draftPush).toHaveBeenCalledWith(
      {
        testCases: expect.arrayContaining([
          expect.objectContaining({
            id: GENERATED_TEST_ID,
            dependencyId,
          }),
        ]),
      },
      expect.anything(),
    );
  });

  it("opens browser with correct URL", async () => {
    await create({ testTargetId: "someId", name: "Test Name" });

    expect(open).toHaveBeenCalledWith(
      expect.stringContaining(
        "/testtargets/someId/testcases/version-123/localEdit",
      ),
    );
  });
});
