import { program } from "commander";
import { buildCmd } from "../src/cli";
import { executeTests } from "../src/tools";
jest.mock("../src/tools");

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

  beforeAll(() => {
    buildCmd();
    program.exitOverride((err) => {
      throw err;
    });
  });

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
