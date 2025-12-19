import { readZipFromResponseBody, executeLocalTestCases } from "../../src/debugtopus/index";
import { ReadableStream } from "stream/web";
import fs from "fs/promises";
import { createWriteStream, existsSync, writeFileSync } from "fs";
import { Open } from "unzipper";
import { pipeline } from "node:stream/promises";
import { client, handleError } from "../../src/tools/client";
import { readTestCasesFromDir } from "../../src/tools/sync/yml";
import { getPlaywrightConfig } from "../../src/tools/playwright";
import { createMockSyncTestCase } from "../mocks";
import { DeepMockProxy, mockDeep, mock } from "jest-mock-extended";
import { ensureChromiumIsInstalled } from "../../src/debugtopus/installation";
import path from "node:path";
import os from "node:os";
import * as fsSync from "node:fs";
import { getPathToOctomindDir, OCTOMIND_DIR } from "../../src/dirManagement";

jest.mock("fs/promises");
jest.mock("fs");
jest.mock("unzipper");
jest.mock("../../src/tools/client");
jest.mock("../../src/tools/sync/yml");
jest.mock("../../src/tools/playwright");
jest.mock("../../src/debugtopus/installation");
jest.mock("child_process");
jest.mock("node:stream/promises");
jest.mock("../../src/dirManagement");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedCreateWriteStream = createWriteStream as jest.MockedFunction<typeof createWriteStream>;
const mockedExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockedWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockedOpen = Open as jest.Mocked<typeof Open>;
const mockedPipeline = pipeline as jest.MockedFunction<typeof pipeline>;
const mockedClient = client as DeepMockProxy<typeof client>;
const mockedReadTestCasesFromDir = readTestCasesFromDir as jest.MockedFunction<typeof readTestCasesFromDir>;
const mockedGetPlaywrightConfig = getPlaywrightConfig as jest.MockedFunction<typeof getPlaywrightConfig>;
const mockedHandleError = handleError as jest.MockedFunction<typeof handleError>;
const mockedEnsureChromiumIsInstalled = ensureChromiumIsInstalled as jest.MockedFunction<typeof ensureChromiumIsInstalled>;

describe("debugtopus", () => {

    let octomindDir: string = `test-data/${OCTOMIND_DIR}`;

    beforeEach(() => {
        jest.clearAllMocks();

        jest.mocked(getPathToOctomindDir).mockResolvedValue(octomindDir);
    });

    describe("readZipFromResponseBody", () => {

        it("should read a zip from a response body", async () => {
            // Create a mock zip buffer (minimal valid zip file)
            // This is a minimal ZIP file structure: local file header + central directory
            const mockZipBuffer = Buffer.from([
                0x50, 0x4B, 0x03, 0x04, // Local file header signature
                0x14, 0x00, // Version needed to extract
                0x00, 0x00, // General purpose bit flag
                0x08, 0x00, // Compression method
                0x00, 0x00, 0x00, 0x00, // Last mod file time and date
                0x00, 0x00, 0x00, 0x00, // CRC-32
                0x05, 0x00, 0x00, 0x00, // Compressed size
                0x05, 0x00, 0x00, 0x00, // Uncompressed size
                0x04, 0x00, // File name length
                0x00, 0x00, // Extra field length
                0x74, 0x65, 0x73, 0x74, // File name: "test"
                0x68, 0x65, 0x6C, 0x6C, 0x6F, // File content: "hello"
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
                write: jest.fn(),
                end: jest.fn(),
                on: jest.fn((event, callback) => {
                    if (event === "finish") {
                        setTimeout(() => callback(), 0);
                    }
                    return mockWriteStream;
                }),
            } as unknown as NodeJS.WritableStream;

            const mockDirectory = {
                extract: jest.fn().mockResolvedValue(undefined),
            };

            mockedCreateWriteStream.mockReturnValue(mockWriteStream as any);
            mockedPipeline.mockResolvedValue(undefined);
            mockedFs.readFile.mockResolvedValue(mockZipBuffer);
            mockedOpen.buffer = jest.fn().mockResolvedValue(mockDirectory);

            await readZipFromResponseBody(mockDirs, mockResponse);

            expect(mockedCreateWriteStream).toHaveBeenCalledWith(
                "/tmp/test-dir/bundle.zip"
            );
            expect(mockedPipeline).toHaveBeenCalled();
            expect(mockedFs.readFile).toHaveBeenCalledWith("/tmp/test-dir/bundle.zip");
            expect(mockedOpen.buffer).toHaveBeenCalledWith(mockZipBuffer);
            expect(mockDirectory.extract).toHaveBeenCalledWith({
                path: "/tmp/test-dir",
            });
        });

        it("should throw an error if zip extraction fails", async () => {
            const mockZipBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04]);

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
                write: jest.fn(),
                end: jest.fn(),
                on: jest.fn((event, callback) => {
                    if (event === "finish") {
                        setTimeout(() => callback(), 0);
                    }
                    return mockWriteStream;
                }),
            } as unknown as NodeJS.WritableStream;

            mockedCreateWriteStream.mockReturnValue(mockWriteStream as any);
            mockedPipeline.mockResolvedValue(undefined);
            mockedFs.readFile.mockResolvedValue(mockZipBuffer);
            mockedOpen.buffer = jest.fn().mockRejectedValue(new Error("Invalid zip"));

            await expect(readZipFromResponseBody(mockDirs, mockResponse)).rejects.toThrow(
                "Failed to extract ZIP at /tmp/test-dir/bundle.zip"
            );
        });

    })

    describe("executeLocalTestCases", () => {


        it("should execute local test cases from zip response body", async () => {
            const mockTestCases = [createMockSyncTestCase()];
            const mockZipBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
            const mockConfig = "export default { testDir: './tests' };";
            const mockReadableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(mockZipBuffer);
                    controller.close();
                },
            });
            const mockResponse = mockDeep<Response>();
            Object.defineProperty(mockResponse, "body", { value: mockReadableStream, writable: true, configurable: true });
            const mockWriteStream = { write: jest.fn(), end: jest.fn(), on: jest.fn() } as any;
            const mockDirectory = { extract: jest.fn().mockResolvedValue(undefined) };

            mockedReadTestCasesFromDir.mockReturnValue(mockTestCases);
            mockedClient.POST.mockResolvedValue({ error: undefined, response: mockResponse, data: undefined });
            mockedExistsSync.mockImplementation((path: Parameters<typeof existsSync>[0]) => {
                const pathStr = typeof path === "string" ? path : path.toString();
                return pathStr.includes("node_modules");
            });
            mockedFs.mkdir.mockResolvedValue(undefined);
            mockedFs.rm.mockResolvedValue(undefined);
            mockedCreateWriteStream.mockReturnValue(mockWriteStream);
            mockedPipeline.mockResolvedValue(undefined);
            mockedFs.readFile.mockResolvedValue(mockZipBuffer);
            mockedOpen.buffer = jest.fn().mockResolvedValue(mockDirectory);
            mockedGetPlaywrightConfig.mockResolvedValue(mockConfig);
            mockedEnsureChromiumIsInstalled.mockResolvedValue(undefined);

            const { exec } = require("child_process");
            (exec as jest.MockedFunction<typeof exec>).mockImplementation((_command: string, _options: any, callback?: any) => {
                if (callback) setImmediate(() => callback(null, { stdout: "", stderr: "" }));
                return {} as any;
            });

            await executeLocalTestCases({
                testTargetId: "test-target-id",
                url: "https://example.com",
                headless: true,
            });

            expect(mockedReadTestCasesFromDir).toHaveBeenCalledWith(octomindDir);
            expect(mockedClient.POST).toHaveBeenCalledWith(
                "/apiKey/beta/test-targets/{testTargetId}/code",
                expect.objectContaining({
                    params: { path: { testTargetId: "test-target-id" } },
                    body: { testCases: mockTestCases, testTargetId: "test-target-id", executionUrl: "https://example.com", environmentId: undefined },
                    parseAs: "stream",
                })
            );
            expect(mockedGetPlaywrightConfig).toHaveBeenCalled();
            expect(mockedWriteFileSync).toHaveBeenCalledWith(expect.stringContaining("config.ts"), mockConfig);
        });

        it("should handle error when response is missing", async () => {
            const mockTestCases = [createMockSyncTestCase()];

            mockedReadTestCasesFromDir.mockReturnValue(mockTestCases);
            mockedClient.POST.mockResolvedValue({
                error: undefined,
                response: null as any,
                data: undefined,
            });

            await expect(
                executeLocalTestCases({
                    testTargetId: "test-target-id",
                    url: "https://example.com",
                    headless: true,
                })
            ).rejects.toThrow();

            expect(mockedHandleError).toHaveBeenCalled();
        });

    })

})
