# Octomind CLI

![Continuous Integration](https://github.com/octomind-dev/cli/actions/workflows/ts.yml/badge.svg)

A command-line interface for interacting with the Octomind API. 
This CLI allows you to execute tests, retrieve test reports, and manage private locations as well as environments.
See [API documentation](https://octomind.dev/docs/api-reference/)

## Usage / Installation

1. To install the package globally do **NOT** just a `npm i -g @octomind/octomind` but instead 
```bash
mkdir -p ~/.local/packages
cd ~/.local/packages
npm install @octomind/octomind@latest
# either create an alias
alias octomind="node ~/.local/packages/node_modules/@octomind/octomind/dist/index.js"
# or create a symlink
sudo ln -s ~/.local/packages/node_modules/@octomind/octomind/dist/index.js /usr/local/bin/octomind
```

this will install the package to `~/.local/packages` and create symlinks in `/usr/local/bin` or creates an alias. 
This is necessary for the cli to work and avoid dependency conflicts, when installing the package globally.

2. Use the cli through npx e.g. `npx @octomind/octomind -h`

## Autocompletion

On macOS and linux you can enable autocompletion by running the following command (works for bash, zsh & fish):
```bash
npx @octomind/octomind install-completion
```
You can disable autocompletion by running the following command:
```bash
npx @octomind/octomind uninstall-completion
```

Autocompletion will only work if you have installed the package globally and created a config file with `npx @octomind/octomind init`.
This way even entityIds like environmentIds or testCaseIds will be autocompleted.

${commands}

## Output Formats

By default, the CLI provides formatted text output for better readability. Add the `--json` flag to any command to get the raw JSON response instead. This is useful for scripting or when you need to process the output programmatically.

Example of JSON output:
```json
{
  "id": "826c15af-644b-4b28-89b4-f50ff34e46b7",
  "testTargetId": "3435918b-3d29-4ebd-8c68-9a540532f45a",
  "status": "PASSED",
  "executionUrl": "https://example.com",
  "testResults": [
    {
      "id": "abc-123-456",
      "testTargetId": "3435918b-3d29-4ebd-8c68-9a540532f45a",
      "testCaseId": "test-1",
      "status": "PASSED",
      "traceUrl": "https://storage.googleapis.com/automagically-traces/abc-123-trace.zip"
    },
    {
      "id": "def-456-789",
      "testTargetId": "3435918b-3d29-4ebd-8c68-9a540532f45a",
      "testCaseId": "test-2",
      "status": "PASSED",
      "traceUrl": "https://storage.googleapis.com/automagically-traces/def-456-trace.zip"
    }
  ]
}
```

## Development

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```

The CLI is written in TypeScript and uses the following dependencies:
- [commander](https://github.com/tj/commander.js): For command-line argument parsing
- [openapi-fetch](https://openapi-ts.dev/openapi-fetch/): For making openapi API calls
- [openapi-typescript](https://openapi-ts.dev/introduction): For generating types from openapi spec

To build from source:
```bash
pnpm run build
```