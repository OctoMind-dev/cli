import fs from "fs/promises";
import path from "path";
import { loadConfig, Config, resetConfig } from "../src/config";
import { homedir } from "os";
jest.mock("fs/promises");
const mockedFs = fs as jest.Mocked<typeof fs>;

const originalConsoleError = console.error;

describe("Config", () => {
  beforeEach(() => {
    console.error = jest.fn();
    resetConfig();
  });

  afterEach(() => {
    console.error = originalConsoleError;
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
      expect(console.error).not.toHaveBeenCalled();
    });

    it("should error and exit when config file does not exist and force is true", async () => {
      const fileNotFoundError = new Error(
        "ENOENT: no such file or directory",
      ) as Error & { code?: string };
      fileNotFoundError.code = "ENOENT";

      mockedFs.readFile.mockRejectedValue(fileNotFoundError);

      const mockExit = jest
        .spyOn(process, "exit")
        .mockImplementation((code?: string | number | null | undefined) => {
          throw new Error(`Process exit with code: ${code}`);
        });

      const MOCK_FORCE_OPTION = true;
      await expect(loadConfig(MOCK_FORCE_OPTION)).rejects.toThrow(
        "Process exit with code: 1",
      );
      expect(console.error).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });
});
