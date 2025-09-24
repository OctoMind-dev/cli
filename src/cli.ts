import { Option } from "commander";

import {
  CompletableCommand,
  environmentIdCompleter,
  installCompletion,
  optionsCompleter,
  tabCompletion,
  testCaseIdCompleter,
  testReportIdCompleter,
  testTargetIdCompleter,
  uninstallCompletion,
} from "./completion";
import { Config, loadConfig, saveConfig } from "./config";
import { runDebugtopus } from "./debugtopus";
import { promptUser, resolveTestTargetId } from "./helpers";
import { startPrivateLocationWorker, stopPLW } from "./plw";
import {
  batchGeneration,
  CreateDiscoveryBody,
  createDiscovery,
  createEnvironment,
  deleteEnvironment,
  deleteTestCase,
  ExecuteTestsBody,
  executeTests,
  GetEnvironmentOptions,
  GetTestCaseParams,
  GetTestReportParams,
  getEnvironment,
  getTestCaseCode,
  listEnvironments,
  listNotifications,
  listPrivateLocations,
  listTestCase,
  listTestCases,
  listTestReport,
  registerLocation,
  unregisterLocation,
  updateEnvironment,
} from "./tools";
import { init, switchTestTarget } from "./tools/init";
import { listTestTargets } from "./tools/test-targets";
import { version } from "./version";

export const BINARY_NAME = "octomind";

const splitter = (value: string): string[] => value.split(/,| |\|/);
const toJSON = (value: string): object => JSON.parse(value);

type TestTargetWrapperOptions = GetEnvironmentOptions &
  GetTestCaseParams &
  GetTestReportParams &
  CreateDiscoveryBody &
  ExecuteTestsBody;

const addTestTargetWrapper =
  (fn: (options: TestTargetWrapperOptions) => Promise<void>) =>
  async (options: TestTargetWrapperOptions) => {
    const resolvedTestTargetId = await resolveTestTargetId(
      options.testTargetId,
    );
    void fn({ ...options, testTargetId: resolvedTestTargetId });
  };

const testTargetIdOption = new Option(
  "-t, --test-target-id [id]",
  "Test target ID, if not provided will use the test target id from the config",
);

const createCommandWithCommonOptions = (
  program: CompletableCommand,
  command: string,
): CompletableCommand => {
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
    .description(
      "Initialize configuration by setting up API key. This will create a config file in ~/.config/octomind.json",
    )
    .helpGroup("setup")
    .option("-t, --test-target-id <id>", "Test target ID")
    .option("-k, --api-key <key>", "the api key for authentication")
    .option("-f, --force", "Force overwrite existing configuration")
    .action(init);

  program
    .completableCommand("switch-test-target")
    .description(
      "Switch to a different test target. This will list all available test targets and update the config file in ~/.config/octomind.json",
    )
    .helpGroup("setup")
    .action(switchTestTarget);

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
    .option(
      "-b, --browser [type]",
      "Browser type [CHROMIUM, FIREFOX, SAFARI]",
      "CHROMIUM",
    )
    .option(
      "-r, --breakpoint [name]",
      "Breakpoint [DESKTOP, MOBILE, TABLET]",
      "DESKTOP",
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
    .description(
      "Start a private location worker, see https://octomind.dev/docs/proxy/private-location",
    )
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
    .description(
      "Stop a private location worker, see https://octomind.dev/docs/proxy/private-location",
    )
    .helpGroup("private-locations")
    .action(stopPLW);

  createCommandWithCommonOptions(program, "notifications")
    .completer(testTargetIdCompleter)
    .description("Get notifications for a test target")
    .helpGroup("notifications")
    .addOption(testTargetIdOption)
    .action(addTestTargetWrapper(listNotifications));

  createCommandWithCommonOptions(program, "delete-test-case")
    .completer(testCaseIdCompleter)
    .description("Delete a test case")
    .requiredOption("-c, --test-case-id <id>", "Test case ID")
    .addOption(testTargetIdOption)
    .helpGroup("test-cases")
    .action(addTestTargetWrapper(deleteTestCase));

  createCommandWithCommonOptions(program, "code")
    .completer(testCaseIdCompleter)
    .completer(testTargetIdCompleter)
    .description("Get code of a specific test case")
    .helpGroup("test-cases")
    .requiredOption("-c, --test-case-id <id>", "Test case ID")
    .requiredOption("-u, --url <url>", "URL to execute the test case against")
    .option("-e, --environment-id [id]", "Environment ID", "default")
    .addOption(testTargetIdOption)
    .action(addTestTargetWrapper(getTestCaseCode));

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

  createCommandWithCommonOptions(program, "batch-generation")
    .completer(testTargetIdCompleter)
    .completer(optionsCompleter)
    .description("Batch generation of test cases")
    .requiredOption("-p, --prompt <prompt>", "Batch generation prompt")
    .requiredOption("-u, --url <url>", "Start url for generation")
    .option("-e, --environment-id <id>", "Environment ID")
    .option("-d, --prerequisite-id <id>", "Prerequisite ID")
    .helpGroup("execute")
    .addOption(testTargetIdOption)
    .action(addTestTargetWrapper(batchGeneration));

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
