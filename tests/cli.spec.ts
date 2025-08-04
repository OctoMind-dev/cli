import { Command } from "commander";
import { buildCmd } from "../src/cli";
import { executeTests } from "../src/tools";
import { runDebugtopus } from "../src/debugtopus";
import { loadConfig } from "../src/config";

jest.mock("../src/tools");
jest.mock("../src/debugtopus");
jest.mock("../src/config", () => ({
  ...jest.requireActual("../src/config"),
  loadConfig: jest.fn(),
}));

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
let program: Command;

beforeAll(() => {
  program = buildCmd();
  program.exitOverride((err) => {
    throw err;
  });
});

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe("CLI Commands parsing options", () => {
  const stdArgs = [
    "node",
    "cli.js",
    "execute",
    "--url",
    "https://example.com",
    "--test-target-id",
    "test-target-123",
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should parse executeTests tags option with comma", async () => {
    await program.parseAsync([...stdArgs, "--tags", "tag1,tags2"]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag1", "tags2"],
      }),
    );
  });

  it("should parse executeTests tags option with space", async () => {
    await program.parseAsync([...stdArgs, "--tags", "tag1 tags2"]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag1", "tags2"],
      }),
    );
  });

  it("should parse executeTests tags option with |", async () => {
    await program.parseAsync([...stdArgs, "--tags", "tag1|tags2"]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag1", "tags2"],
      }),
    );
  });

  it("should parse executeTests tags option always as array", async () => {
    await program.parseAsync([...stdArgs, "--tags", "tag1"]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag1"],
      }),
    );
  });

  it("should parse executeTests vars option as JSON", async () => {
    await program.parseAsync([
      ...stdArgs,
      "--variables-to-overwrite",
      '{ "foo": ["bar"] }',
    ]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        variablesToOverwrite: { foo: ["bar"] },
      }),
    );
  });
});

describe("config overwrite behaviour", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should resolve testTargetId from parameter when provided", async () => {
    const providedTestTargetId = "provided-test-target-123";

    await program.parseAsync([
      "node",
      "cli.js",
      "debug",
      "--url",
      "https://example.com",
      "--test-target-id",
      providedTestTargetId,
    ]);

    expect(runDebugtopus).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com",
        testTargetId: providedTestTargetId,
      }),
    );
  });

  it("should resolve testTargetId from config when not provided as parameter", async () => {
    const mockResolvedId = "config-test-target-456";
    const mockConfig = {
      apiKey: "test-api-key",
      testTargetId: mockResolvedId,
    };
    (loadConfig as jest.Mock).mockResolvedValue(mockConfig);

    await program.parseAsync([
      "node",
      "cli.js",
      "debug",
      "--url",
      "https://example.com",
    ]);

    expect(runDebugtopus).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com",
        testTargetId: mockResolvedId,
      }),
    );
  });
});
