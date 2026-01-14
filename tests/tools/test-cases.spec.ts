import fsPromises from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { findOctomindFolder } from "../../src/helpers";
import { client, handleError } from "../../src/tools/client";
import { buildFilename, readTestCasesFromDir } from "../../src/tools/sync/yml";
import { deleteTestCase } from "../../src/tools/test-cases";

vi.mock("../../src/tools/client");
vi.mock("../../src/helpers");
vi.mock("../../src/tools/sync/yml");

describe("test-cases", () => {
  let clientDELETE: Mock;

  beforeEach(() => {
    clientDELETE = vi.mocked(client.DELETE);
    console.log = vi.fn();
  });

  describe("deleteTestCase via API", () => {
    beforeEach(() => {
      vi.mocked(findOctomindFolder).mockResolvedValue(null);
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
      vi.mocked(findOctomindFolder).mockResolvedValue(tmpDir);
    });

    afterEach(async () => {
      await fsPromises.rm(tmpDir, { recursive: true });
    });

    it("should delete a test case file when it exists locally", async () => {
      const testCaseId = "test-case-id";
      const fileName = "myTestCase.yaml";
      const filePath = path.join(tmpDir, fileName);
      await fsPromises.writeFile(filePath, "");

      vi.mocked(readTestCasesFromDir).mockReturnValue([
        { id: testCaseId, description: "My Test Case" },
      ] as ReturnType<typeof readTestCasesFromDir>);
      vi.mocked(buildFilename).mockReturnValue(fileName);

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
      vi.mocked(readTestCasesFromDir).mockReturnValue([]);

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
