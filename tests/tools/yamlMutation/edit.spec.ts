import fs from "fs";

import { findOctomindFolder, getAbsoluteFilePathInOctomindRoot } from "../../../src/helpers";
import { readTestCasesFromDir } from "../../../src/tools/sync/yml";
import { checkForConsistency } from "../../../src/tools/sync/consistency";
import { draftPush } from "../../../src/tools/sync/push";
import { edit } from "../../../src/tools/yamlMutations/edit";
import { OCTOMIND_FOLDER_NAME } from "../../../src/constants";

jest.mock("../../../src/helpers");
jest.mock("../../../src/tools/sync/yml");
jest.mock("../../../src/tools/sync/consistency");
jest.mock("../../../src/tools/sync/push");
jest.mock("fs");

const OCTOMIND_ROOT = "/project/.octomind";
const TEST_CASE_PATH = `${OCTOMIND_ROOT}/myTestCase.yaml`;

describe("edit", () => {
  const originalConsoleLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();

    // Default happy path mocks
    jest.mocked(findOctomindFolder).mockResolvedValue(OCTOMIND_ROOT);
    jest.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(TEST_CASE_PATH);
    jest.mocked(fs.readFileSync).mockReturnValue("");
    jest.mocked(readTestCasesFromDir).mockReturnValue([]);
    jest.mocked(draftPush).mockResolvedValue({ success: true, versionIds: [] });
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  it("should throw error if octomind folder not found", async () => {
    jest.mocked(findOctomindFolder).mockResolvedValue(null);

    await expect(
      edit({ testTargetId: "test-target-id", filePath: "test.yaml" }),
    ).rejects.toThrow(
      `Could not find ${OCTOMIND_FOLDER_NAME} folder, make sure to pull before trying to edit`,
    );
  });

  it("should throw error if file path not found in octomind root", async () => {
    jest.mocked(getAbsoluteFilePathInOctomindRoot).mockResolvedValue(null);

    await expect(
      edit({ testTargetId: "test-target-id", filePath: "nonexistent.yaml" }),
    ).rejects.toThrow(
      `Could not find nonexistent.yaml in folder ${OCTOMIND_ROOT}`,
    );
  });

  it("should load test case and call draftPush with relevant test cases", async () => {
    const testCase = { id: "test-case-1", description: "My Test Case" };
    jest.mocked(fs.readFileSync).mockReturnValue("id: test-case-1\ndescription: My Test Case");
    jest.mocked(readTestCasesFromDir).mockReturnValue([testCase] as ReturnType<typeof readTestCasesFromDir>);

    await edit({ testTargetId: "test-target-id", filePath: "myTestCase.yaml" });

    expect(checkForConsistency).toHaveBeenCalledWith([testCase]);
    expect(draftPush).toHaveBeenCalledWith(
      { testCases: [testCase] },
      expect.objectContaining({ testTargetId: "test-target-id" }),
    );
  });

  it("should include dependency chain in relevant test cases", async () => {
    const parentTestCase = { id: "parent-id", description: "Parent" };
    const childTestCase = { id: "child-id", description: "Child", dependencyId: "parent-id" };
    jest.mocked(fs.readFileSync).mockReturnValue("id: child-id\ndescription: Child\ndependencyId: parent-id");
    jest.mocked(readTestCasesFromDir).mockReturnValue([parentTestCase, childTestCase] as ReturnType<typeof readTestCasesFromDir>);

    await edit({ testTargetId: "test-target-id", filePath: "childTest.yaml" });

    expect(checkForConsistency).toHaveBeenCalledWith([childTestCase, parentTestCase]);
    expect(draftPush).toHaveBeenCalledWith(
      { testCases: [childTestCase, parentTestCase] },
      expect.objectContaining({ testTargetId: "test-target-id" }),
    );
  });

  it("should throw error if dependency not found", async () => {
    const orphanTestCase = { id: "orphan-id", description: "Orphan", dependencyId: "missing-id" };
    jest.mocked(fs.readFileSync).mockReturnValue("id: orphan-id\ndescription: Orphan\ndependencyId: missing-id");
    jest.mocked(readTestCasesFromDir).mockReturnValue([orphanTestCase] as ReturnType<typeof readTestCasesFromDir>);

    await expect(
      edit({ testTargetId: "test-target-id", filePath: "orphan.yaml" }),
    ).rejects.toThrow("Could not find dependency missing-id for orphan-id");
  });

  it("should throw error if test case file cannot be parsed", async () => {
    jest.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("File not found");
    });

    await expect(
      edit({ testTargetId: "test-target-id", filePath: "invalid.yaml" }),
    ).rejects.toThrow(`Could not parse ${TEST_CASE_PATH}`);
  });
});
