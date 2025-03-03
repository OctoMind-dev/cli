import { program } from "commander";
import { run } from "../src/cli";
import { executeTests } from "../src/api";
import { env } from "process";

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
    run();
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
});
