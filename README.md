# Octomind CLI

A command-line interface for interacting with the Octomind API. 
This CLI allows you to execute tests, retrieve test reports, and manage private locations as well as environments.
See [API documentation](https://octomind.dev/docs/api-reference/)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```

## Commands

### Execute Tests

Run test cases against a specified URL.

```bash
tsx src/index.ts execute \
  --api-key <key> \
  --test-target-id <id> \
  --url <url> \
  [--environment <name>] \
  [--description <text>] \
  [--json]
```

Options:
- `-k, --api-key` (required): Your Octomind API key
- `-t, --test-target-id` (required): Test target ID
- `-u, --url` (required): URL to test
- `-e, --environment`: Environment name (default: "default")
- `-d, --description`: Test description
- `-j, --json`: Output raw JSON response

### Get Test Report

Retrieve details about a specific test report.

```bash
tsx src/index.ts report \
  --api-key <key> \
  --test-target-id <id> \
  --report-id <id> \
  [--json]
```

Options:
- `-k, --api-key` (required): Your Octomind API key
- `-t, --test-target-id` (required): Test target ID
- `-r, --report-id` (required): Test report ID
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
tsx src/index.ts register-location \
  --api-key <key> \
  --name <name> \
  --proxypass <password> \
  --proxyuser <user> \
  --address <address> \
  [--json]
```

Options:
- `-k, --api-key` (required): Your Octomind API key
- `-n, --name` (required): Location name
- `-p, --proxypass` (required): Proxy password
- `-u, --proxyuser` (required): Proxy user
- `-a, --address` (required): Location address (format: IP:PORT)
- `-j, --json`: Output raw JSON response

### Unregister Private Location

Remove a registered private location worker. If you use the [private location worker](https://github.com/OctoMind-dev/private-location-worker) it will unregister itself when going offline automatically.

```bash
tsx src/index.ts unregister-location \
  --api-key <key> \
  --name <name> \
  [--json]
```

Options:
- `-k, --api-key` (required): Your Octomind API key
- `-n, --name` (required): Location name
- `-j, --json`: Output raw JSON response

### List Private Locations

List all registered private locations.

```bash
tsx src/index.ts list-private-locations \
  --api-key <key> \
  [--json]
```

Options:
- `-k, --api-key` (required): Your Octomind API key
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
tsx src/index.ts list-environments \
  --api-key <key> \
  --test-target-id <id> \
  [--json]
```

Options:
- `-k, --api-key` (required): Your Octomind API key
- `-t, --test-target-id` (required): Test target ID
- `-j, --json`: Output raw JSON response

### Create Environment

Create a new environment for a test target.

```bash
tsx src/index.ts create-environment \
  --api-key <key> \
  --test-target-id <id> \
  --name <name> \
  --discovery-url <url> \
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
- `-k, --api-key` (required): Your Octomind API key
- `-t, --test-target-id` (required): Test target ID
- `-n, --name` (required): Environment name
- `-d, --discovery-url` (required): Discovery URL
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
tsx src/index.ts update-environment \
  --api-key <key> \
  --test-target-id <id> \
  --environment-id <id> \
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
- `-k, --api-key` (required): Your Octomind API key
- `-t, --test-target-id` (required): Test target ID
- `-e, --environment-id` (required): Environment ID
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
tsx src/index.ts delete-environment \
  --api-key <key> \
  --test-target-id <id> \
  --environment-id <id> \
  [--json]
```

Options:
- `-k, --api-key` (required): Your Octomind API key
- `-t, --test-target-id` (required): Test target ID
- `-e, --environment-id` (required): Environment ID
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

## Error Handling

The CLI will:
- Validate required parameters before making API calls
- Display clear error messages for missing or invalid parameters
- Show API error responses with details when available
- Exit with status code 1 on errors

## Development

The CLI is written in TypeScript and uses the following dependencies:
- `commander`: For command-line argument parsing
- `axios`: For making HTTP requests

To build from source:
```bash
npm run build
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.