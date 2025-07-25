import fs from "fs/promises";
import path from "path";
import { loadConfig, Config } from "../src/config";

jest.mock("fs/promises");
const mockedFs = fs as jest.Mocked<typeof fs>;

const originalConsoleError = console.error;

describe("Config", () => {
  beforeEach(() => {
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe("loadConfig", () => {
    it("should load and parse a valid config file", async () => {
      const mockConfig: Config = {
        apiKey: "test-api-key-12345",
        testTargetId: "test-target-id-67890",
      };

      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadConfig();

      expect(result).toEqual(mockConfig);
      expect(mockedFs.readFile).toHaveBeenCalledWith(
        path.join(process.cwd(), "octomind.config.json"),
        "utf8",
      );
    });

    it("should error when config file does not exist", async () => {
      const fileNotFoundError = new Error(
        "ENOENT: no such file or directory",
      ) as Error & { code?: string };
      fileNotFoundError.code = "ENOENT";

      mockedFs.readFile.mockRejectedValue(fileNotFoundError);

      await loadConfig();

      expect(console.error).toHaveBeenCalled();
    });
  });
});
