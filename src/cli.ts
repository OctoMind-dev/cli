

import { version } from "./version";

import { Command, Option, program } from "commander";

import { Config, loadConfig, saveConfig } from "./config";
import { runDebugtopus } from "./debugtopus";
import { promptUser, resolveTestTargetId } from "./helpers";
import { startPrivateLocationWorker, stopPLW } from "./plw";

import {
  createDiscovery,
  createEnvironment,
  deleteEnvironment,
  deleteTestCase,
  executeTests,
  listEnvironments,
  listNotifications,
  listPrivateLocations,
  listTestCase,
  listTestCases,
  listTestReport,
  registerLocation,
  unregisterLocation,
  updateEnvironment,

  listTestCases,
  ExecuteTestsBody,
  CreateDiscoveryBody,
  GetTestReportParams,
  GetEnvironmentOptions,
  GetTestCaseParams,
  getEnvironment,
  deleteTestCase,
} from "./tools";
import { Config, loadConfig, saveConfig } from "./config";
import { promptUser, resolveTestTargetId } from "./helpers";
import { runDebugtopus } from "./debugtopus";

import { startPrivateLocationWorker, stopPLW } from "./plw";
import { getTestTargets, listTestTargets } from "./tools/test-targets";
import { CompletableCommand, environmentIdCompleter, installCompletion, optionsCompleter, tabCompletion, testCaseIdCompleter, testReportIdCompleter, testTargetIdCompleter, uninstallCompletion } from "./completion";


export const BINARY_NAME = "octomind";

const splitter = (value: string): string[] => value.split(/,| |\|/);
const toJSON = (value: string): object => JSON.parse(value);

type TestTargetWrapperOptions = GetEnvironmentOptions & GetTestCaseParams & GetTestReportParams & CreateDiscoveryBody & ExecuteTestsBody;

const addTestTargetWrapper = (fn: (options: TestTargetWrapperOptions) => Promise<void>) => async (options: TestTargetWrapperOptions) => {
    const resolvedTestTargetId = await resolveTestTargetId(options.testTargetId);
    void fn({ ...options, testTargetId: resolvedTestTargetId });
};

const selectTestTarget = async (): Promise<string> => {
  const testTargets = await getTestTargets();
  await listTestTargets({});

  if (testTargets.length === 1) {
    console.log(
      `Only one test target found, using it: ${testTargets[0].app} (${testTargets[0].id})`,
    );
    return testTargets[0].id;
  }

  const testTargetIndex = await promptUser(
    "Enter number of the test target you want to use (optional, press Enter to skip): ",
  );
  const testTargetIndexAsInt = Number.parseInt(testTargetIndex);

  if (Number.isNaN(testTargetIndexAsInt) || testTargetIndexAsInt < 1 || testTargetIndexAsInt > testTargets.length) {
    console.log("❌ could not find a test target with the index you provided");
    process.exit(1);
  }
  const testTargetId = testTargets[testTargetIndexAsInt - 1].id;
  if (!testTargetId) {
    console.log("❌ could not find a test target with the index you provided");
    process.exit(1);
  }

  return testTargetId;
};
const testTargetIdOption = new Option(
  "-t, --test-target-id [id]",
  "Test target ID, if not provided will use the test target id from the config",
);

const createCommandWithCommonOptions = (program: CompletableCommand, command: string): CompletableCommand => {
  return program
    .completableCommand(command)
    .option("-j, --json", "Output raw JSON response") as CompletableCommand;
};

export const buildCmd = (): CompletableCommand => {
  const program = new CompletableCommand();

  program
    .name(BINARY_NAME)
    .description(
      `Octomind cli tool. Version: ${version}. Additional documentation see https://octomind.dev/docs/api-reference/`,
    )
    .version(version);

  program
  .completer(testTargetIdCompleter)
  .completer(optionsCompleter)
  .completableCommand("init")
    .description("Initialize configuration by setting up API key. This will create a config file in ~/.config/octomind.json")
    .helpGroup("setup")
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

          const existingConfig = await loadConfig(options.force);

          if (existingConfig.apiKey && !options.force) {
            console.log("⚠️  Configuration already exists.");
            const overwrite = await promptUser(
              "Do you want to overwrite it? (y/N): ",
            );

            if (
              overwrite.toLowerCase() !== "y" &&
              overwrite.toLowerCase() !== "yes"
            ) {
              console.log("Configuration unchanged.");
              return;
            }
          }

          let apiKey: string = "";
          if (!options.apiKey) {
            apiKey = await promptUser(
              "Enter your API key. Go to https://octomind.dev/docs/run-tests/execution-curl#create-an-api-key to learn how to generate one: ",
            );
            if (!apiKey) {
              console.log("❌ API key is required.");
              process.exit(1);
            }
          }
          // saving here to be able to use the api key for the test targets
          const newApiKeyConfig = {
            ...existingConfig,

            apiKey: options.apiKey,
          }

          await saveConfig(newApiKeyConfig);

          const testTargetId = await selectTestTarget();

          const newConfig: Config = {
            ...existingConfig,
            apiKey: options.apiKey,
            testTargetId: options.testTargetId ?? testTargetId,
          };

          await saveConfig(newConfig);

          console.log("\n✨ Initialization complete!");
        } catch (error) {
          console.error(
            "❌ Error during initialization:",
            (error as Error).message,
          );
          process.exit(1);
        }
      },
    );

  program
    .completableCommand("switch-test-target")
    .description("Switch to a different test target. This will list all available test targets and update the config file in ~/.config/octomind.json")
    .helpGroup("setup")
    .action(async () => {
      const testTargetId = await selectTestTarget();
      const existingConfig = await loadConfig();
      const newConfig: Config = {
        ...existingConfig,
        testTargetId,
      };
      await saveConfig(newConfig);
      console.log(`✨ Switched to test target: ${testTargetId}`);
    });

  createCommandWithCommonOptions(program, "debug")
    .completer(environmentIdCompleter)
    .completer(testTargetIdCompleter)
    .completer(testCaseIdCompleter)
    .completer(optionsCompleter)
    .description("run test cases against local build")
    .helpGroup("execute")
    .requiredOption("-u, --url <url>", "url the tests should run against")
    .option(
      "-c, --test-case-id [uuid]",
      "id of the test case you want to run, if not provided will run all test cases in the test target",
    )
    .option(
      "-e, --environment-id [uuid]",
      "id of the environment you want to run against, if not provided will run all test cases against the default environment",
    )
    .option(
      "-t, --test-target-id [uuid]",
      "id of the test target of the test case, if not provided will use the test target id from the config",
    )
    .option(
      "--headless",
      "if we should run headless without the UI of playwright and the browser",
    )
    .option(
      "--persist",
      "if we should write playwright config and files to current directory, you can then run 'npx playwright test' to run them again",
    )
    .option("--grep [substring]", "filter test cases by substring")
    .action(addTestTargetWrapper(runDebugtopus));


  createCommandWithCommonOptions(program, "execute")
    .completer(testTargetIdCompleter)
    .completer(optionsCompleter)
    .description("Execute test cases to create a test report")
    .helpGroup("execute")
    .requiredOption("-u, --url <url>", "URL to test")
    .addOption(testTargetIdOption)
    .option("-e, --environment-name [name]", "Environment name", "default")
    .option("-d, --description [text]", "Test description")
    .option("-g, --tags [tags]", "comma separated list of tags", splitter)
    .option(
      "-v, --variables-to-overwrite [variables]",
      "JSON object of variables to overwrite",
      toJSON,
    )
    .action(addTestTargetWrapper(executeTests));

  createCommandWithCommonOptions(program, "test-report")
    .completer(testReportIdCompleter)
    .completer(testTargetIdCompleter)
    .completer(optionsCompleter)
    .description("Get test report details")
    .helpGroup("test-reports")
    .requiredOption("-r, --test-report-id <id>", "Test report ID")
    .addOption(testTargetIdOption)
    .action(addTestTargetWrapper(listTestReport));

  createCommandWithCommonOptions(program, "register-location")
    .completer(optionsCompleter)
    .description("Register a private location")
    .helpGroup("private-locations")
    .requiredOption("-n, --name <name>", "Location name")
    .requiredOption("-p, --password <password>", "Proxy password")
    .requiredOption("-u, --username <user>", "Proxy user")
    .requiredOption("-a, --address <address>", "Location address")
    .action(registerLocation);

  createCommandWithCommonOptions(program, "unregister-location")
    .completer(optionsCompleter)
    .description("Unregister a private location")
    .helpGroup("private-locations")
    .requiredOption("-n, --name <name>", "Location name")
    .action(unregisterLocation);

  createCommandWithCommonOptions(program, "list-private-locations")
    .completer(optionsCompleter)
    .description("List all private locations")
    .helpGroup("private-locations")
    .action(listPrivateLocations);

  createCommandWithCommonOptions(program, "list-environments")
    .completer(testTargetIdCompleter)
    .description("List all environments")
    .helpGroup("environments")
    .addOption(testTargetIdOption)

    .action(addTestTargetWrapper(listEnvironments));


  createCommandWithCommonOptions(program, "create-environment")
    .completer(testTargetIdCompleter)
    .completer(optionsCompleter)
    .description("Create a new environment")
    .helpGroup("environments")
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

    .action(addTestTargetWrapper(createEnvironment));

  createCommandWithCommonOptions(program, "environment")
    .completer(environmentIdCompleter)
    .completer(testTargetIdCompleter)
    .completer(optionsCompleter)
    .description("Get an environment")
    .helpGroup("environments")
    .requiredOption("-e, --environment-id <id>", "Environment ID")
    .addOption(testTargetIdOption)
    .action(addTestTargetWrapper(getEnvironment));


  createCommandWithCommonOptions(program, "update-environment")
    .completer(environmentIdCompleter)
    .completer(testTargetIdCompleter)
    .completer(optionsCompleter)
    .description("Update an existing environment")
    .helpGroup("environments")
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

    .action(addTestTargetWrapper(updateEnvironment));


  createCommandWithCommonOptions(program, "delete-environment")
    .completer(environmentIdCompleter)
    .completer(testTargetIdCompleter)
    .description("Delete an environment")
    .helpGroup("environments")
    .requiredOption("-e, --environment-id <id>", "Environment ID")
    .addOption(testTargetIdOption)
    .action(addTestTargetWrapper(deleteEnvironment));

  program

    .completer(optionsCompleter)
    .completableCommand("start-private-location")
    .description("Start a private location worker, see https://octomind.dev/docs/proxy/private-location")
    .helpGroup("private-locations")

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

    .completableCommand("stop-private-location")
    .completer(optionsCompleter)
    .description("Stop a private location worker, see https://octomind.dev/docs/proxy/private-location")
    .helpGroup("private-locations")

    .action(stopPLW);

  createCommandWithCommonOptions(program, "notifications")
    .completer(testTargetIdCompleter)
    .description("Get notifications for a test target")
    .helpGroup("notifications")
    .addOption(testTargetIdOption)

    .action(addTestTargetWrapper(listNotifications));

  createCommandWithCommonOptions(program,"delete-test-case")
    .completer(testCaseIdCompleter)
    .description("Delete a test case")
    .requiredOption("-c, --test-case-id <id>", "Test case ID")
    .addOption(testTargetIdOption)
    .helpGroup("test-cases")
    .action(addTestTargetWrapper(deleteTestCase));

  createCommandWithCommonOptions("list-test-cases")
    .description("List all test cases")
    .addOption(testTargetIdOption)
    .action(async (options, command) => {
      const resolvedTestTargetId = await resolveTestTargetId(
        options.testTargetId,
      );
      command.setOptionValue("testTargetId", resolvedTestTargetId);
      void listTestCases({ ...options, status: "ENABLED" });
    });


  createCommandWithCommonOptions(program, "test-case")
    .completer(testCaseIdCompleter)
    .completer(testTargetIdCompleter)
    .description("Get details of a specific test case")
    .helpGroup("test-cases")
    .requiredOption("-c, --test-case-id <id>", "Test case ID")
    .addOption(testTargetIdOption)
    .action(addTestTargetWrapper(listTestCase));


  createCommandWithCommonOptions(program, "create-discovery")
    .completer(testTargetIdCompleter)
    .completer(optionsCompleter)
    .description("Create a new test case discovery")
    .helpGroup("execute")
    .requiredOption("-n, --name <name>", "Discovery name")
    .requiredOption("-p, --prompt <prompt>", "Discovery prompt")
    .addOption(testTargetIdOption)
    .option("-e, --entry-point-url-path [path]", "Entry point URL path")
    .option("--prerequisite-id [id]", "Prerequisite test case ID")
    .option("--external-id [id]", "External identifier")
    .option(
      "--assigned-tag-ids [ids]",
      "Comma-separated list of tag IDs",
      splitter,
    )
    .option("--folder-id [id]", "Folder ID")

    .action(addTestTargetWrapper(createDiscovery));

  createCommandWithCommonOptions(program, "list-test-cases")
    .completer(testTargetIdCompleter)
    .description("List all test cases")
    .helpGroup("test-cases")
    .addOption(testTargetIdOption)
    .action(addTestTargetWrapper(listTestCases));

  createCommandWithCommonOptions(program, "list-test-targets")
    .description("List all test targets")
    .helpGroup("test-targets")
    .action(listTestTargets);
  
  program
    .completableCommand("install-completion")
    .description("Install tab completion")
    .helpGroup("completion")
    .action(installCompletion);
  program
    .completableCommand("uninstall-completion")
    .description("Uninstall tab completion")
    .helpGroup("completion")
    .action(uninstallCompletion);
  
  program
    .completableCommand("completion")
    .description("Tab completion")
    .helpGroup("completion")
    .allowExcessArguments(true)
    .action(() => tabCompletion(program));

  return program;
};
