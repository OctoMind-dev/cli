import { program } from "commander";
import { buildCmd } from "../src/cli";
import { executeTests } from "../src/tools";
jest.mock("../src/tools");

describe("CLI Commands parsing options", () => {
  const stdArgs = ["node", "cli.js", "execute", "--url", "https://example.com"];

  beforeAll(() => {
    buildCmd();
    program.exitOverride((err) => {
      throw err;
    });
  });

  it("should parse executeTests tags option with comma", () => {
    program.parse([...stdArgs, "--tags", "tag1,tags2"]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag1", "tags2"],
      }),
      expect.anything(),
    );
  });

  it("should parse executeTests tags option with space", () => {
    program.parse([...stdArgs, "--tags", "tag1 tags2"]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag1", "tags2"],
      }),
      expect.anything(),
    );
  });

  it("should parse executeTests tags option with |", () => {
    program.parse([...stdArgs, "--tags", "tag1|tags2"]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag1", "tags2"],
      }),
      expect.anything(),
    );
  });

  it("should parse executeTests tags option always as array", () => {
    program.parse([...stdArgs, "--tags", "tag1"]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag1"],
      }),
      expect.anything(),
    );
  });

  it("should parse executeTests vars option as JSON", () => {
    program.parse([
      ...stdArgs,
      "--variables-to-overwrite",
      '{ "foo": ["bar"] }',
    ]);
    expect(executeTests).toHaveBeenCalledWith(
      expect.objectContaining({
        variablesToOverwrite: { foo: ["bar"] },
      }),
      expect.anything(),
    );
  });
});
