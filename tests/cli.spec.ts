import { program } from "commander";
import { buildCmd } from "../src/cli";
import { executeTests } from "../src/api";

jest.mock("../src/api");

describe("CLI Commands parsing options", () => {
  const stdArgs = [
    "node",
    "cli.js",
    "execute",
    "--api-key",
    "test-api-key",
    "--test-target-id",
    "test-target-id",
    "--url",
    "https://example.com",
  ];

  beforeAll(() => {
    buildCmd();
  });

  it("should parse executeTests tags option with comma", () => {
    program.exitOverride((err) => {
      throw err;
    });
    program.parse([...stdArgs, "--tags", "tag1,tags2"]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag1", "tags2"],
      }),
      expect.anything(),
    );
  });

  it("should parse executeTests tags option with space", () => {
    program.exitOverride((err) => {
      throw err;
    });
    program.parse([...stdArgs, "--tags", "tag1 tags2"]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag1", "tags2"],
      }),
      expect.anything(),
    );
  });

  it("should parse executeTests tags option with |", () => {
    program.exitOverride((err) => {
      throw err;
    });
    program.parse([...stdArgs, "--tags", "tag1|tags2"]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag1", "tags2"],
      }),
      expect.anything(),
    );
  });

  it("should parse executeTests tags option always as array", () => {
    program.exitOverride((err) => {
      throw err;
    });
    program.parse([...stdArgs, "--tags", "tag1"]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag1"],
      }),
      expect.anything(),
    );
  });
});
