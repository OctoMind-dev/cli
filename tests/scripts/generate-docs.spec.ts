import { generateCommandDocs } from "../../scripts/generate-docs";
import { Command } from "commander";

describe("generateCommandDocs", () => {
  const mockCommand = new Command("test-command");
  mockCommand.version("1.0.0");
  mockCommand.command("test").description("test").option("-t, --test", "test");
  mockCommand.command("test2").description("test2").helpGroup("test");
  mockCommand.command("test3").description("test3").helpGroup("setup");
  it("should generate documentation", () => {
    const docs = generateCommandDocs(mockCommand);
    expect(docs).toMatchInlineSnapshot(`
"# test-command

**Usage:** \`test-command [options] [command]\`

### Options

| Option | Description | Required | Default |
|:-------|:----------|:---------|:--------|
| \`-V, --version\` | output the version number | No |  |

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

### Options

| Option | Description | Required | Default |
|:-------|:----------|:---------|:--------|
| \`-t, --test\` | test | No |  |

"
`);
  });
});
