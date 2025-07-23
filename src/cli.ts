import { program, Option, Command } from "commander";
import { version } from "./version";
import {
  createEnvironment,
  deleteEnvironment,
  executeTests,
  getTestReport,
  listEnvironments,
  listPrivateLocations,
  registerLocation,
  unregisterLocation,
  updateEnvironment,
} from "./tools";

const apiKeyOption = new Option(
  "-k, --api-key <key>",
  "the api key for authentication",
)
  .env("APIKEY")
  .makeOptionMandatory();

const createCommandWithCommonOptions = (command: string): Command => {
  return program
    .command(command)
    .addOption(apiKeyOption)
    .option("-j, --json", "Output raw JSON response");
};

const splitter = (value: string): string[] => value.split(/,| /);
const toJSON = (value: string): object => JSON.parse(value);

export const buildCmd = (): Command => {
  program
    .name("octomind-cli")
    .description(
      `Octomind CLI tool. Version: ${version}. see https://octomind.dev/docs/api-reference/`,
    )
    .version(version);

  createCommandWithCommonOptions("execute")
    .description("Execute test cases")
    .requiredOption("-t, --test-target-id <id>", "Test target ID")
    .requiredOption("-u, --url <url>", "URL to test")
    .option("-e, --environmentName <name>", "Environment name", "default")
    .option("-d, --description <text>", "Test description")
    .option("-g, --tags <tags>", "comma separated list of tags", splitter)
    .option(
      "-v, --variables-to-overwrite <variables>",
      "JSON object of variables to overwrite",
      toJSON,
    )
    .action(executeTests);

  createCommandWithCommonOptions("test-report")
    .description("Get test report details")
    .requiredOption("-t, --test-target-id <id>", "Test target ID")
    .requiredOption("-r, --test-report-id <id>", "Test report ID")
    .action(getTestReport);

  createCommandWithCommonOptions("register-location")
    .description("Register a private location")
    .requiredOption("-n, --name <name>", "Location name")
    .requiredOption("-p, --password <password>", "Proxy password")
    .requiredOption("-u, --username <user>", "Proxy user")
    .requiredOption("-a, --address <address>", "Location address")
    .action(registerLocation);

  createCommandWithCommonOptions("unregister-location")
    .description("Unregister a private location")
    .requiredOption("-n, --name <name>", "Location name")
    .action(unregisterLocation);

  createCommandWithCommonOptions("list-private-locations")
    .description("List all private locations")
    .action(listPrivateLocations);

  createCommandWithCommonOptions("list-environments")
    .description("List all environments")
    .requiredOption("-t, --test-target-id <id>", "Test target ID")
    .action(listEnvironments);

  createCommandWithCommonOptions("create-environment")
    .description("Create a new environment")
    .requiredOption("-t, --test-target-id <id>", "Test target ID")
    .requiredOption("-n, --name <name>", "Environment name")
    .requiredOption("-d, --discovery-url <url>", "Discovery URL")
    .option("--test-account-username <username>", "Test account username")
    .option("--test-account-password <password>", "Test account password")
    .option(
      "--test-account-otp-initializer-key <key>",
      "Test account OTP initializer key",
    )
    .option("--basic-auth-username <username>", "Basic auth username")
    .option("--basic-auth-password <password>", "Basic auth password")
    .option("--private-location-name <name>", "Private location name")
    .action(createEnvironment);

  createCommandWithCommonOptions("update-environment")
    .description("Update an existing environment")
    .requiredOption("-t, --test-target-id <id>", "Test target ID")
    .requiredOption("-e, --environment-id <id>", "Environment ID")
    .option("-n, --name <name>", "Environment name")
    .option("-d, --discovery-url <url>", "Discovery URL")
    .option("--test-account-username <username>", "Test account username")
    .option("--test-account-password <password>", "Test account password")
    .option(
      "--test-account-otp-initializer-key <key>",
      "Test account OTP initializer key",
    )
    .option("--basic-auth-username <username>", "Basic auth username")
    .option("--basic-auth-password <password>", "Basic auth password")
    .option("--private-location-name <name>", "Private location name")
    .action(updateEnvironment);

  createCommandWithCommonOptions("delete-environment")
    .description("Delete an environment")
    .requiredOption("-t, --test-target-id <id>", "Test target ID")
    .requiredOption("-e, --environment-id <id>", "Environment ID")
    .action(deleteEnvironment);
  return program;
};
