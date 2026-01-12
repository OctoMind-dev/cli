import fsPromises from "fs/promises";
import os from "os";
import path from "path";

import { findOctomindFolder } from "../../src/helpers";
import { client, handleError } from "../../src/tools/client";
import { buildFilename, readTestCasesFromDir } from "../../src/tools/sync/yml";
import { deleteTestCase } from "../../src/tools/test-cases";

jest.mock("../../src/tools/client");
jest.mock("../../src/helpers");
jest.mock("../../src/tools/sync/yml");

describe("test-cases", () => {
  const originalConsoleLog = console.log;
  let clientDELETE: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    clientDELETE = client.DELETE as jest.Mock;
    console.log = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe("deleteTestCase via API", () => {
    beforeEach(() => {
      jest.mocked(findOctomindFolder).mockResolvedValue(null);
    });

    it("should delete a test case", async () => {
      clientDELETE.mockResolvedValue({
        data: { success: true },
        error: undefined,
      });
      await deleteTestCase({
        testTargetId: "test-target-id",
        testCaseId: "test-case-id",
      });
      expect(handleError).toHaveBeenCalledWith(undefined);
      expect(console.log).toHaveBeenCalledWith(
        "Test Case deleted successfully",
      );
    });

    it("should handle error", async () => {
      clientDELETE.mockResolvedValue({
        data: undefined,
        error: { message: "error" },
      });
      await deleteTestCase({
        testTargetId: "test-target-id",
        testCaseId: "test-case-id",
      });
      expect(handleError).toHaveBeenCalledWith({ message: "error" });
    });
  });

  describe("deleteTestCase via local filesystem", () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await fsPromises.mkdtemp(
        path.join(os.tmpdir(), "octomind-test-"),
      );
      jest.mocked(findOctomindFolder).mockResolvedValue(tmpDir);
    });

    afterEach(async () => {
      await fsPromises.rm(tmpDir, { recursive: true });
    });

    it("should delete a test case file when it exists locally", async () => {
      const testCaseId = "test-case-id";
      const fileName = "myTestCase.yaml";
      const filePath = path.join(tmpDir, fileName);
      await fsPromises.writeFile(filePath, "");

      jest
        .mocked(readTestCasesFromDir)
        .mockReturnValue([
          { id: testCaseId, description: "My Test Case" },
        ] as ReturnType<typeof readTestCasesFromDir>);
      jest.mocked(buildFilename).mockReturnValue(fileName);

      await deleteTestCase({
        testTargetId: "test-target-id",
        testCaseId,
      });

      expect(console.log).toHaveBeenCalledWith(
        "Test Case deleted successfully",
      );
      await expect(fsPromises.access(filePath)).rejects.toThrow();
    });

    it("should log message when test case ID is not found locally", async () => {
      jest.mocked(readTestCasesFromDir).mockReturnValue([]);

      await deleteTestCase({
        testTargetId: "test-target-id",
        testCaseId: "non-existent-id",
      });

      expect(console.log).toHaveBeenCalledWith(
        `No test case with id non-existent-id found in folder ${tmpDir}`,
      );
      expect(clientDELETE).not.toHaveBeenCalled();
    });
  });
});
