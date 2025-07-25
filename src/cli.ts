import { program, Command, Option } from "commander";
import { version } from "./version";
import {
  createDiscovery,
  createEnvironment,
  deleteEnvironment,
  executeTests,
  listNotifications,
  listTestCase,
  listTestReport,
  listEnvironments,
  listPrivateLocations,
  registerLocation,
  unregisterLocation,
  updateEnvironment,
  listTestCases,
} from "./tools";
import { Config, loadConfig, saveConfig } from "./config";
import { promptUser, resolveTestTargetId } from "./helpers";
import { runDebugtopus } from "./debugtopus";

import { startPrivateLocationWorker, stopPLW } from "./plw";

const createCommandWithCommonOptions = (command: string): Command => {
  return program
    .command(command)
    .option("-j, --json", "Output raw JSON response");
};

const splitter = (value: string): string[] => value.split(/,| |\|/);
const toJSON = (value: string): object => JSON.parse(value);

const testTargetIdOption = new Option("-t, --test-target-id [id]", 
  "Test target ID, if not provided will use the test target id from the config");

export const buildCmd = (): Command => {
  program
    .name("octomind")
    .description(
      `Octomind cli tool. Version: ${version}. Additional documentation see https://octomind.dev/docs/api-reference/`,
    )
    .version(version);

  program
    .command("init")
    .description("Initialize configuration by setting up API key")
    .option("-t, --test-target-id <id>", "Test target ID")
    .option("-k, --api-key <key>", "the api key for authentication")
    .option("-f, --force", "Force overwrite existing configuration")
    .action(
      async (options: {
        testTargetId?: string;
        apiKey: string;
        force?: boolean;
      }) => {
        try {
          console.log("🚀 Initializing configuration...\n");

          const existingConfig = await loadConfig();

          if (existingConfig.apiKey && !options.force) {
            console.log("⚠️  Configuration already exists.");
            const overwrite = await promptUser(
              "Do you want to overwrite it? (y/N): "
            );

            if (
              overwrite.toLowerCase() !== "y" &&
              overwrite.toLowerCase() !== "yes"
            ) {
              console.log("Configuration unchanged.");
              return;
            }
          }

          let apiKey;
          if (!options.apiKey) {
            apiKey = await promptUser(
              "Enter your API key. Go to https://octomind.dev/docs/run-tests/execution-curl#create-an-api-key to learn how to generate one: "
            );
            if (!apiKey) {
              console.log("❌ API key is required.");
              process.exit(1);
            }
          }
          let testTargetId;
          if (!options.testTargetId) {
            testTargetId = await promptUser(
              "Enter test target id (optional, press Enter to skip): "
            );
          }

          const newConfig: Config = {
            ...existingConfig,
            apiKey: options.apiKey ?? apiKey,
            testTargetId: options.testTargetId ?? testTargetId,
          };

          await saveConfig(newConfig);

          console.log("\n✨ Initialization complete!");
        } catch (error) {
          console.error(
            "❌ Error during initialization:",
            (error as Error).message
          );
          process.exit(1);
        }
      }
    );

  createCommandWithCommonOptions("debug")
    .description("run test cases against local build")
    .requiredOption("-u, --url <url>", "url the tests should run against")
    .option(
      "-i, --id [uuid]",
      "id of the test case you want to run, if not provided will run all test cases in the test target",
    )
    .option(
      "-e, --environment-id [uuid]",
      "id of the environment you want to run against, if not provided will run all test cases against the default environment",
    )
    .option(
      "-a, --test-target-id [uuid]",
      "id of the test target of the test case, if not provided will use the test target id from the config",
    )
    .option(
      "--headless",
      "if we should run headless without the UI of playwright and the browser"
    )
    .option(
      "--persist",
      "if we should write playwright config and files to current directory, you can then run 'npx playwright test' to run them again"
    )
    .option("--grep [substring]", "filter test cases by substring")
    .action(async (options, command) => {
      const resolvedTestTargetId = await resolveTestTargetId(
        options.testTargetId
      );
      command.setOptionValue("testTargetId", resolvedTestTargetId);
      void runDebugtopus(options);
    });

  createCommandWithCommonOptions("execute")
    .description("Execute test cases")
    .requiredOption("-u, --url <url>", "URL to test")
    .addOption(testTargetIdOption)
    .option("-e, --environment-name [name]", "Environment name", "default")
    .option("-d, --description [text]", "Test description")
    .option("-g, --tags [tags]", "comma separated list of tags", splitter)
    .option(
      "-v, --variables-to-overwrite [variables]",
      "JSON object of variables to overwrite",
      toJSON
    )
    .action(async (options) => {
      const testTargetId = await resolveTestTargetId(options.testTargetId);
      await executeTests({
        ...options,
        testTargetId,
      });
    });

  createCommandWithCommonOptions("test-report")
    .description("Get test report details")
    .requiredOption("-r, --test-report-id <id>", "Test report ID")
    .addOption(testTargetIdOption)
    .action(async (options) => {
      const testTargetId = await resolveTestTargetId(options.testTargetId);
      await listTestReport({
        ...options,
        testTargetId,
      });
    });

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
    .addOption(testTargetIdOption)
    .action(async (options, command) => {
      const resolvedTestTargetId = await resolveTestTargetId(
        options.testTargetId
      );
      command.setOptionValue("testTargetId", resolvedTestTargetId);
      void listEnvironments(options);
    });

  createCommandWithCommonOptions("create-environment")
    .description("Create a new environment")
    .requiredOption("-n, --name <name>", "Environment name")
    .requiredOption("-d, --discovery-url <url>", "Discovery URL")
    .addOption(testTargetIdOption)
    .option("--test-account-username [username]", "Test account username")
    .option("--test-account-password [password]", "Test account password")
    .option(
      "--test-account-otp-initializer-key [key]",
      "Test account OTP initializer key",
    )
    .option("--basic-auth-username [username]", "Basic auth username")
    .option("--basic-auth-password [password]", "Basic auth password")
    .option("--private-location-name [name]", "Private location name")
    .action(async (_, options) =>
      createEnvironment({
        ...options,
        testTargetId: await resolveTestTargetId(options.testTargetId),
      })
    );

  createCommandWithCommonOptions("update-environment")
    .description("Update an existing environment")
    .requiredOption("-e, --environment-id <id>", "Environment ID")
    .addOption(testTargetIdOption)
    .option("-n, --name [name]", "Environment name")
    .option("-d, --discovery-url [url]", "Discovery URL")
    .option("--test-account-username [username]", "Test account username")
    .option("--test-account-password [password]", "Test account password")
    .option(
      "--test-account-otp-initializer-key [key]",
      "Test account OTP initializer key",
    )
    .option("--basic-auth-username [username]", "Basic auth username")
    .option("--basic-auth-password [password]", "Basic auth password")
    .option("--private-location-name [name]", "Private location name")
    .action(async (_, options) =>
      updateEnvironment({
        ...options,
        testTargetId: await resolveTestTargetId(options.testTargetId),
      })
    );

  createCommandWithCommonOptions("delete-environment")
    .description("Delete an environment")
    .requiredOption("-e, --environment-id <id>", "Environment ID")
    .addOption(testTargetIdOption)
    .action(deleteEnvironment);

  program
    .command("start-private-location")
    .description("Start a private location worker, see https://octomind.dev/docs/proxy/private-location")
    .option("-n, --name [name]", "Location name")
    .option("-u, --username [username]", "Proxy user")
    .option("-p, --password [password]", "Proxy password")
    .option(
      "-l, --host-network",
      "Use host network (default: false). If set you can use localhost directly",
      false,
    )
    .action(startPrivateLocationWorker);

  program
    .command("stop-private-location")
    .description("Stop a private location worker, see https://octomind.dev/docs/proxy/private-location")
    .action(stopPLW);

  createCommandWithCommonOptions("notifications")
    .description("Get notifications for a test target")
    .addOption(testTargetIdOption)
    .action(async (options, command) => {
      const resolvedTestTargetId = await resolveTestTargetId(
        options.testTargetId
      );
      command.setOptionValue("testTargetId", resolvedTestTargetId);
      void listNotifications(options);
    });

  createCommandWithCommonOptions("test-case")
    .description("Get details of a specific test case")
    .requiredOption("-c, --test-case-id <id>", "Test case ID")
    .addOption(testTargetIdOption)
    .action(async (options, command) => {
      const resolvedTestTargetId = await resolveTestTargetId(
        options.testTargetId
      );
      command.setOptionValue("testTargetId", resolvedTestTargetId);
      void listTestCase(options);
    });

  createCommandWithCommonOptions("create-discovery")
    .description("Create a new test case discovery")
    .requiredOption("-n, --name <name>", "Discovery name")
    .requiredOption("-p, --prompt <prompt>", "Discovery prompt")
    .addOption(testTargetIdOption)
    .option("-e, --entry-point-url-path [path]", "Entry point URL path")
    .option("--prerequisite-id [id]", "Prerequisite test case ID")
    .option("--external-id [id]", "External identifier")
    .option(
      "--assigned-tag-ids [ids]", "Comma-separated list of tag IDs", splitter,
    )
    .option("--folder-id [id]", "Folder ID")
    .action(async (options, command) => {
      const resolvedTestTargetId = await resolveTestTargetId(
        options.testTargetId
      );
      command.setOptionValue("testTargetId", resolvedTestTargetId);
      void createDiscovery(options);
    });

  createCommandWithCommonOptions("list-test-cases")
    .description("List all test cases")
    .addOption(testTargetIdOption)
    .action(async (options, command) => {
      const resolvedTestTargetId = await resolveTestTargetId(
        options.testTargetId,
      );
      command.setOptionValue("testTargetId", resolvedTestTargetId);
      void listTestCases({...options, status: "ENABLED"});
    });

  return program;
};
