# Octomind CLI

![Continuous Integration](https://github.com/octomind-dev/cli/actions/workflows/ts.yml/badge.svg)

A command-line interface for interacting with the Octomind API.
This CLI allows you to execute tests, retrieve test reports, and manage private locations as well as environments.
See [API documentation](https://octomind.dev/docs/api-reference/)

## Usage

1. Install the package - `npm i -g @octomind/octomind` and use it directly e.g. `octomind -h`
2. Use the cli through npx e.g. `npx @octomind/octomind -h`

## Commands

### Init

Initialize configuration by setting up your API key and optionally a test target ID. This allows you to avoid passing these parameters for subsequent commands.

```bash
octomind init \
  [--api-key <key>] \
  [--test-target-id <id>] \
  [--force]
```

Options:

- `-k, --api-key`: Your Octomind API key (will prompt if not provided)
- `-t, --test-target-id`: Test target ID (optional)
- `-f, --force`: Force overwrite existing configuration

If you don't provide the API key via the command line option, the CLI will prompt you to enter it interactively. Read the [docs](https://octomind.dev/docs/run-tests/execution-curl#create-an-api-key) to learn how to generate an api key.

### Execute Tests

Run test cases against a specified URL.

```bash
octomind execute \
  --url <url> \
  [--api-key <key>] \
  [--test-target-id <id>] \
  [--environment <name>] \
  [--tags <list of tags>] \
  [-v, --variables-to-overwrite <variables>] \
  [--description <text>] \
  [--json]
```

Options:

- `-u, --url` (required): URL to test
- `-k, --api-key`: Your Octomind API key (optional if configured via `init`)
- `-t, --test-target-id`: Test target ID (optional if configured via `init`)
- `-e, --environment`: Environment name (default: "default")
- `-d, --description`: Test description
- `-g, --tags`: comma separated list of tags for tests to execute
- `-v, --variables-to-overwrite`: JSON object for variables to override for this run e.g. `{ "key": ["v1", "v2"]}`
- `-j, --json`: Output raw JSON response

### Get Test Report

Retrieve details about a specific test report.

```bash
octomind report \
  --report-id <id> \
  [--api-key <key>] \
  [--test-target-id <id>] \
  [--json]
```

Options:

- `-r, --report-id` (required): Test report ID
- `-k, --api-key`: Your Octomind API key (optional if configured via `init`)
- `-t, --test-target-id`: Test target ID (optional if configured via `init`)
- `-j, --json`: Output raw JSON response

Example text output:

```
Test Report Details:
Status: PASSED
Execution URL: https://example.com

Test Results:
- Test abc-123-456: PASSED
  Trace: https://storage.googleapis.com/automagically-traces/abc-123-trace.zip
- Test def-456-789: PASSED
  Trace: https://storage.googleapis.com/automagically-traces/def-456-trace.zip
```

Example JSON output:

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

### Register Private Location

Register a new private location worker. If you use the [private location worker](https://github.com/OctoMind-dev/private-location-worker) it will register itself on startup automatically.

```bash
octomind register-location \
  --name <name> \
  --proxypass <password> \
  --proxyuser <user> \
  --address <address> \
  [--api-key <key>] \
  [--json]
```

Options:

- `-n, --name` (required): Location name
- `-p, --proxypass` (required): Proxy password
- `-u, --proxyuser` (required): Proxy user
- `-a, --address` (required): Location address (format: IP:PORT)
- `-k, --api-key`: Your Octomind API key (optional if configured via `init`)
- `-j, --json`: Output raw JSON response

### Unregister Private Location

Remove a registered private location worker. If you use the [private location worker](https://github.com/OctoMind-dev/private-location-worker) it will unregister itself when going offline automatically.

```bash
octomind unregister-location \
  --name <name> \
  [--api-key <key>] \
  [--json]
```

Options:

- `-n, --name` (required): Location name
- `-k, --api-key`: Your Octomind API key (optional if configured via `init`)
- `-j, --json`: Output raw JSON response

### List Private Locations

List all registered private locations.

```bash
octomind list-private-locations \
  [--api-key <key>] \
  [--json]
```

Options:

- `-k, --api-key`: Your Octomind API key (optional if configured via `init`)
- `-j, --json`: Output raw JSON response

Example text output:

```
Private Locations:
- Name: location-1
  Status: ONLINE
  Address: https://location-1.example.com
- Name: location-2
  Status: OFFLINE
  Address: https://location-2.example.com
```

### List Environments

List all available environments.

```bash
octomind list-environments \
  [--api-key <key>] \
  [--test-target-id <id>] \
  [--json]
```

Options:

- `-k, --api-key`: Your Octomind API key (optional if configured via `init`)
- `-t, --test-target-id`: Test target ID (optional if configured via `init`)
- `-j, --json`: Output raw JSON response

### Create Environment

Create a new environment for a test target.

```bash
octomind create-environment \
  --name <name> \
  --discovery-url <url> \
  [--api-key <key>] \
  [--test-target-id <id>] \
  [--test-account-username <username>] \
  [--test-account-password <password>] \
  [--test-account-otp-initializer-key <key>] \
  [--basic-auth-username <username>] \
  [--basic-auth-password <password>] \
  [--private-location-name <name>] \
  [--additional-header-fields <fields>] \
  [--json]
```

Options:

- `-n, --name` (required): Environment name
- `-d, --discovery-url` (required): Discovery URL
- `-k, --api-key`: Your Octomind API key (optional if configured via `init`)
- `-t, --test-target-id`: Test target ID (optional if configured via `init`)
- `--test-account-username`: Test account username
- `--test-account-password`: Test account password
- `--test-account-otp-initializer-key`: OTP initializer key for test account
- `--basic-auth-username`: Basic auth username
- `--basic-auth-password`: Basic auth password
- `--private-location-name`: Private location name
- `--additional-header-fields`: Additional header fields (JSON string)
- `-j, --json`: Output raw JSON response

### Update Environment

Update an existing environment.

```bash
octomind update-environment \
  --environment-id <id> \
  [--api-key <key>] \
  [--test-target-id <id>] \
  [--name <name>] \
  [--discovery-url <url>] \
  [--test-account-username <username>] \
  [--test-account-password <password>] \
  [--test-account-otp-initializer-key <key>] \
  [--basic-auth-username <username>] \
  [--basic-auth-password <password>] \
  [--private-location-name <name>] \
  [--additional-header-fields <fields>] \
  [--json]
```

Options:

- `-e, --environment-id` (required): Environment ID
- `-k, --api-key`: Your Octomind API key (optional if configured via `init`)
- `-t, --test-target-id`: Test target ID (optional if configured via `init`)
- `-n, --name`: New environment name
- `-d, --discovery-url`: New discovery URL
- `--test-account-username`: New test account username
- `--test-account-password`: New test account password
- `--test-account-otp-initializer-key`: New OTP initializer key for test account
- `--basic-auth-username`: New basic auth username
- `--basic-auth-password`: New basic auth password
- `--private-location-name`: New private location name
- `--additional-header-fields`: New additional header fields (JSON string)
- `-j, --json`: Output raw JSON response

### Delete Environment

Delete an existing environment.

```bash
octomind delete-environment \
  --environment-id <id> \
  [--api-key <key>] \
  [--test-target-id <id>] \
  [--json]
```

Options:

- `-e, --environment-id` (required): Environment ID
- `-k, --api-key`: Your Octomind API key (optional if configured via `init`)
- `-t, --test-target-id`: Test target ID (optional if configured via `init`)
- `-j, --json`: Output raw JSON response

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

- `commander`: For command-line argument parsing
- `axios`: For making HTTP requests

To build from source:

```bash
pnpm run build
```
