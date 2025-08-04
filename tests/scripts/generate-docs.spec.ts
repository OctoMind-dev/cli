import { generateCommandDocs } from "../../scripts/generate-docs";
import { Command } from "commander";

describe("generateCommandDocs", () => {
  const mockCommand = new Command();
  mockCommand.command("test").description("test");
  mockCommand.command("test2").description("test2").helpGroup("test");
  mockCommand.command("test3").description("test3").helpGroup("setup");
  it("should generate documentation", () => {
    const docs = generateCommandDocs(mockCommand);
    expect(docs).toMatchInlineSnapshot(`
"# 

**Usage:** \` [options] [command]\`

#  CLI Documentation



## Setup

## test3

test3

**Usage:** \`test3 [options]\`

## Test

## test2

test2

**Usage:** \`test2 [options]\`

## Other Commands

## test

test

**Usage:** \`test [options]\`

"
`);
  });
});
