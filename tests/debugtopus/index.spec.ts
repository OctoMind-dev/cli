import { ExecException } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { exec } from "child_process";
import { createWriteStream, existsSync, writeFileSync } from "fs";
import fs from "fs/promises";
import { ReadableStream } from "stream/web";

import { Open } from "unzipper";
import { describe, expect, it, vi } from "vitest";
import { mock, mockDeep } from "vitest-mock-extended";

import {
  executeLocalTestCases,
  readZipFromResponseBody,
} from "../../src/debugtopus/index";
import { ensureChromiumIsInstalled } from "../../src/debugtopus/installation";
import { findOctomindFolder } from "../../src/helpers";
import { client } from "../../src/tools/client";
import { getPlaywrightConfig } from "../../src/tools/playwright";
import { readTestCasesFromDir } from "../../src/tools/sync/yaml";
import { createMockSyncTestCase } from "../mocks";

vi.mock("fs/promises");
vi.mock("fs");
vi.mock("unzipper");
vi.mock("../../src/tools/client");
vi.mock("../../src/tools/sync/yaml");
vi.mock("../../src/tools/playwright");
vi.mock("../../src/debugtopus/installation");
vi.mock("../../src/helpers");
vi.mock("child_process");
vi.mock("node:stream/promises");
vi.mock("util", () => ({
  promisify: vi.fn(() => vi.fn().mockResolvedValue({})),
}));

const mockedFs = vi.mocked(fs);
const mockedCreateWriteStream = vi.mocked(createWriteStream);
const mockedExistsSync = vi.mocked(existsSync);
const mockedWriteFileSync = vi.mocked(writeFileSync);

const mockedOpen = vi.mocked(Open);
const mockedPipeline = vi.mocked(pipeline);
const mockedClient = vi.mocked(client);
const mockedReadTestCasesFromDir = vi.mocked(readTestCasesFromDir);

const mockedGetPlaywrightConfig = vi.mocked(getPlaywrightConfig);
const mockedEnsureChromiumIsInstalled = vi.mocked(ensureChromiumIsInstalled);

describe("debugtopus", () => {
  describe("readZipFromResponseBody", () => {
    it("should read a zip from a response body", async () => {
      // Create a mock zip buffer (minimal valid zip file)
      // This is a minimal ZIP file structure: local file header + central directory
      const mockZipBuffer = Buffer.from([
        0x50,
        0x4b,
        0x03,
        0x04, // Local file header signature
        0x14,
        0x00, // Version needed to extract
        0x00,
        0x00, // General purpose bit flag
        0x08,
        0x00, // Compression method
        0x00,
        0x00,
        0x00,
        0x00, // Last mod file time and date
        0x00,
        0x00,
        0x00,
        0x00, // CRC-32
        0x05,
        0x00,
        0x00,
        0x00, // Compressed size
        0x05,
        0x00,
        0x00,
        0x00, // Uncompressed size
        0x04,
        0x00, // File name length
        0x00,
        0x00, // Extra field length
        0x74,
        0x65,
        0x73,
        0x74, // File name: "test"
        0x68,
        0x65,
        0x6c,
        0x6c,
        0x6f, // File content: "hello"
      ]);

      const mockReadableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(mockZipBuffer);
          controller.close();
        },
      });

      const mockResponse = {
        body: mockReadableStream,
      } as Response;

      const mockDirs = {
        testDirectory: "/tmp/test-dir",
        outputDir: "/tmp/test-dir/output",
        configFilePath: "/tmp/test-dir/config.ts",
        packageRootDir: "/tmp",
      };

      const mockWriteStream = {
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn((event, callback) => {
          if (event === "finish") {
            setTimeout(() => callback(), 0);
          }
          return mockWriteStream;
        }),
      } as unknown as NodeJS.WritableStream;

      const mockDirectory = {
        extract: vi.fn().mockResolvedValue(undefined),
      };

      // @ts-expect-error - mockWriteStream is a WritableStream
      mockedCreateWriteStream.mockReturnValue(mockWriteStream);
      mockedPipeline.mockResolvedValue(undefined);
      mockedFs.readFile.mockResolvedValue(mockZipBuffer);
      mockedOpen.buffer = vi.fn().mockResolvedValue(mockDirectory);

      await readZipFromResponseBody(mockDirs, mockResponse);

      expect(mockedCreateWriteStream).toHaveBeenCalledWith(
        "/tmp/test-dir/bundle.zip",
      );
      expect(mockedPipeline).toHaveBeenCalled();
      expect(mockedFs.readFile).toHaveBeenCalledWith(
        "/tmp/test-dir/bundle.zip",
      );
      expect(mockedOpen.buffer).toHaveBeenCalledWith(mockZipBuffer);
      expect(mockDirectory.extract).toHaveBeenCalledWith({
        path: "/tmp/test-dir",
      });
    });

    it("should throw an error if zip extraction fails", async () => {
      const mockZipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

      const mockReadableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(mockZipBuffer);
          controller.close();
        },
      });

      const mockResponse = {
        body: mockReadableStream,
      } as Response;

      const mockDirs = {
        testDirectory: "/tmp/test-dir",
        outputDir: "/tmp/test-dir/output",
        configFilePath: "/tmp/test-dir/config.ts",
        packageRootDir: "/tmp",
      };

      const mockWriteStream = {
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn((event, callback) => {
          if (event === "finish") {
            setTimeout(() => callback(), 0);
          }
          return mockWriteStream;
        }),
      } as unknown as NodeJS.WritableStream;

      // @ts-expect-error - mockWriteStream is a WritableStream
      mockedCreateWriteStream.mockReturnValue(mockWriteStream);
      mockedPipeline.mockResolvedValue(undefined);
      mockedFs.readFile.mockResolvedValue(mockZipBuffer);
      mockedOpen.buffer = vi.fn().mockRejectedValue(new Error("Invalid zip"));

      await expect(
        readZipFromResponseBody(mockDirs, mockResponse),
      ).rejects.toThrow("Failed to extract ZIP at /tmp/test-dir/bundle.zip");
    });
  });

  describe("executeLocalTestCases", () => {
    const OCTOMIND_ROOT = "/project/.octomind";
    const mockZipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const mockConfig = "export default { testDir: './tests' };";

    const setupExecutionMocks = () => {
      const mockReadableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(mockZipBuffer);
          controller.close();
        },
      });
      const mockResponse = mockDeep<Response>();
      Object.defineProperty(mockResponse, "body", {
        value: mockReadableStream,
        writable: true,
        configurable: true,
      });

      vi.mocked(findOctomindFolder).mockResolvedValue(OCTOMIND_ROOT);
      mockedClient.POST.mockResolvedValue({
        error: undefined,
        response: mockResponse,
        data: undefined,
      });
      mockedExistsSync.mockImplementation(
        (p: Parameters<typeof existsSync>[0]) =>
          (typeof p === "string" ? p : p.toString()).includes("node_modules"),
      );
      mockedFs.mkdir.mockResolvedValue(undefined);
      mockedFs.rm.mockResolvedValue(undefined);
      mockedCreateWriteStream.mockReturnValue(mockDeep());
      mockedPipeline.mockResolvedValue(undefined);
      mockedFs.readFile.mockResolvedValue(mockZipBuffer);
      mockedOpen.buffer = vi
        .fn()
        .mockResolvedValue({ extract: vi.fn().mockResolvedValue(undefined) });
      mockedGetPlaywrightConfig.mockResolvedValue(mockConfig);
      mockedEnsureChromiumIsInstalled.mockResolvedValue(undefined);
      vi.mocked(exec).mockImplementation(
        (
          _command: string,
          _options: unknown,
          callback?: (
            error: ExecException | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          if (callback) setImmediate(() => callback(null, "", ""));
          return mock();
        },
      );
    };

    it("should execute local test cases from zip response body", async () => {
      const mockTestCases = [createMockSyncTestCase()];
      setupExecutionMocks();
      mockedReadTestCasesFromDir.mockReturnValue(mockTestCases);

      await executeLocalTestCases({
        testTargetId: "test-target-id",
        url: "https://example.com",
        headless: true,
      });

      expect(mockedReadTestCasesFromDir).toHaveBeenCalledWith(OCTOMIND_ROOT);
      expect(mockedClient.POST).toHaveBeenCalledWith(
        "/apiKey/beta/test-targets/{testTargetId}/code",
        expect.objectContaining({
          params: { path: { testTargetId: "test-target-id" } },
          body: {
            testCases: mockTestCases,
            testTargetId: "test-target-id",
            executionUrl: "https://example.com",
            environmentId: undefined,
          },
          parseAs: "stream",
        }),
      );
      expect(mockedGetPlaywrightConfig).toHaveBeenCalled();
      expect(mockedWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("config.ts"),
        mockConfig,
      );
    });

    it("should filter test cases by testCaseId when provided", async () => {
      setupExecutionMocks();
      mockedReadTestCasesFromDir.mockReturnValue([
        createMockSyncTestCase({ id: "other-1" }),
        createMockSyncTestCase({ id: "target-id" }),
        createMockSyncTestCase({ id: "other-2" }),
      ]);

      await executeLocalTestCases({
        testTargetId: "test-target-id",
        url: "https://example.com",
        testCaseId: "target-id",
      });

      expect(mockedClient.POST).toHaveBeenCalledWith(
        "/apiKey/beta/test-targets/{testTargetId}/code",
        expect.objectContaining({
          body: expect.objectContaining({
            testCases: [expect.objectContaining({ id: "target-id" })],
          }),
        }),
      );
    });

    it("should throw an error if testCaseId does not match any test case", async () => {
      vi.mocked(findOctomindFolder).mockResolvedValue(OCTOMIND_ROOT);
      mockedReadTestCasesFromDir.mockReturnValue([
        createMockSyncTestCase({ id: "test-case-1" }),
      ]);

      await expect(
        executeLocalTestCases({
          testTargetId: "test-target-id",
          url: "https://example.com",
          testCaseId: "non-existent-id",
        }),
      ).rejects.toThrow("Could not find test case with id non-existent-id");
    });
  });
});
