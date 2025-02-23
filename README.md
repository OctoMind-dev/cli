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

Register a new private location worker. If you use the [private location worker](https://github.com/OctoMind-dev/private-location-worker) is will register itself on startup automatically.

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

Remove a registered private location worker. If you use the [private location worker](https://github.com/OctoMind-dev/private-location-worker) is will unregister itself when going offline automatically.

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

Liste alle registrierten privaten Standorte auf.

```bash
tsx src/index.ts list-private-locations \
  --api-key <key> \
  [--json]
```

Optionen:
- `-k, --api-key` (erforderlich): Ihr Octomind API-Schlüssel
- `-j, --json`: Ausgabe als Raw-JSON-Response

Beispiel Textausgabe:
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

Liste alle verfügbaren Umgebungen für einen Test-Target auf.

```bash
tsx src/index.ts list-environments \
  --api-key <key> \
  --test-target-id <id> \
  [--json]
```

Optionen:
- `-k, --api-key` (erforderlich): Ihr Octomind API-Schlüssel
- `-t, --test-target-id` (erforderlich): Test-Target ID
- `-j, --json`: Ausgabe als Raw-JSON-Response

### Create Environment

Erstelle eine neue Umgebung für einen Test-Target.

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

Optionen:
- `-k, --api-key` (erforderlich): Ihr Octomind API-Schlüssel
- `-t, --test-target-id` (erforderlich): Test-Target ID
- `-n, --name` (erforderlich): Name der Umgebung
- `-d, --discovery-url` (erforderlich): Discovery URL
- `--test-account-username`: Benutzername für Test-Account
- `--test-account-password`: Passwort für Test-Account
- `--test-account-otp-initializer-key`: OTP Initializer Key für Test-Account
- `--basic-auth-username`: Basic Auth Benutzername
- `--basic-auth-password`: Basic Auth Passwort
- `--private-location-name`: Name des privaten Standorts
- `--additional-header-fields`: Zusätzliche Header-Felder (JSON-String)
- `-j, --json`: Ausgabe als Raw-JSON-Response

### Update Environment

Aktualisiere eine bestehende Umgebung.

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

Optionen:
- `-k, --api-key` (erforderlich): Ihr Octomind API-Schlüssel
- `-t, --test-target-id` (erforderlich): Test-Target ID
- `-e, --environment-id` (erforderlich): Environment ID
- `-n, --name`: Neuer Name der Umgebung
- `-d, --discovery-url`: Neue Discovery URL
- `--test-account-username`: Neuer Benutzername für Test-Account
- `--test-account-password`: Neues Passwort für Test-Account
- `--test-account-otp-initializer-key`: Neuer OTP Initializer Key für Test-Account
- `--basic-auth-username`: Neuer Basic Auth Benutzername
- `--basic-auth-password`: Neues Basic Auth Passwort
- `--private-location-name`: Neuer Name des privaten Standorts
- `--additional-header-fields`: Neue zusätzliche Header-Felder (JSON-String)
- `-j, --json`: Ausgabe als Raw-JSON-Response

### Delete Environment

Lösche eine bestehende Umgebung.

```bash
tsx src/index.ts delete-environment \
  --api-key <key> \
  --test-target-id <id> \
  --environment-id <id> \
  [--json]
```

Optionen:
- `-k, --api-key` (erforderlich): Ihr Octomind API-Schlüssel
- `-t, --test-target-id` (erforderlich): Test-Target ID
- `-e, --environment-id` (erforderlich): Environment ID
- `-j, --json`: Ausgabe als Raw-JSON-Response

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