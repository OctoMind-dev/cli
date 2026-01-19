import fs from "fs/promises";
import { homedir } from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Config, loadConfig, resetConfig } from "../src/config";
import { mockLogger } from "./mocks";

vi.mock("fs/promises");
const mockedFs = vi.mocked(fs);

describe("Config", () => {
  beforeEach(() => {
    mockLogger.error.mockClear();
    resetConfig();
  });

  afterEach(() => {
    process.env = { ...process.env, OCTOMIND_CONFIG_FILE: "" };
  });

  describe("loadConfig", () => {
    it("should load and parse a valid config file at a different location", async () => {
      const configFileName = "octomind-test.json";
      process.env.OCTOMIND_CONFIG_FILE = configFileName;

      const mockConfig: Config = {
        apiKey: "test-api-key-12345",
        testTargetId: "test-target-id-67890",
      };

      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfig();

      expect(result).toEqual(mockConfig);
      expect(mockedFs.readFile).toHaveBeenCalledWith(
        path.join(homedir(), ".config", configFileName),
        "utf8",
      );
    });

    it("should load and parse a valid config file", async () => {
      const mockConfig: Config = {
        apiKey: "test-api-key-12345",
        testTargetId: "test-target-id-67890",
      };

      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfig();

      expect(result).toEqual(mockConfig);
      expect(mockedFs.readFile).toHaveBeenCalledWith(
        path.join(homedir(), ".config", "octomind.json"),
        "utf8",
      );
    });

    it("should return empty config when config file does not exist", async () => {
      const fileNotFoundError = new Error(
        "ENOENT: no such file or directory",
      ) as Error & { code?: string };
      fileNotFoundError.code = "ENOENT";

      mockedFs.readFile.mockRejectedValue(fileNotFoundError);

      const result = await loadConfig();

      expect(result).toEqual({});
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("should error and exit when config file does not exist and force is true", async () => {
      const fileNotFoundError = new Error(
        "ENOENT: no such file or directory",
      ) as Error & { code?: string };
      fileNotFoundError.code = "ENOENT";

      mockedFs.readFile.mockRejectedValue(fileNotFoundError);

      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation((code?: string | number | null | undefined) => {
          throw new Error(`Process exit with code: ${code}`);
        });

      const MOCK_FORCE_OPTION = true;
      await expect(loadConfig(MOCK_FORCE_OPTION)).rejects.toThrow(
        "Process exit with code: 1",
      );
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });
});
