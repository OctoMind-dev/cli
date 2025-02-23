import axios from "axios";
import { program } from "commander";
import {
  ExecuteTestsOptions,
  GetTestReportOptions,
  RegisterLocationOptions,
  UnregisterLocationOptions,
  ListPrivateLocationsOptions,
  PrivateLocationInfo,
  ListEnvironmentsOptions,
  CreateEnvironmentOptions,
  UpdateEnvironmentOptions,
  DeleteEnvironmentOptions,
  TestTargetExecutionRequest,
  TestReportResponse,
  RegisterRequest,
  UnregisterRequest,
  SuccessResponse,
  Environment,
  TestReport,
} from "./types";

/* eslint no-console: ["error", { allow: ["warn", "error", "log"] }] */
/* eslint i18n-text/no-en: "off" */
/* eslint github/array-foreach: "off" */

const BASE_URL = "https://app.octomind.dev/api";

// Helper function for API calls
async function apiCall<T>(
  method: "get" | "post" | "put" | "delete" | "patch",
  endpoint: string,
  apiKey: string,
  data?: any,
): Promise<T> {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    });
    return response.data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("API Error:", error.response?.data || error.message);
    } else {
      console.error("Error:", error);
    }
    process.exit(1);
  }
}

// Output helper function
function outputResult(result: any, json: boolean) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  return result;
}

// Command implementations
export async function executeTests(options: ExecuteTestsOptions) {
  if (!options.apiKey) {
    console.error("API key is required");
    process.exit(1);
  }

  const requestBody: TestTargetExecutionRequest = {
    testTargetId: options.testTargetId,
    url: options.url,
    context: {
      source: "manual",
      description: options.description || "CLI execution",
      triggeredBy: {
        type: "USER",
        userId: "cli-user",
      },
    },
    environmentName: options.environment,
  };

  const response = await apiCall<TestReportResponse>(
    "post",
    "/apiKey/v2/execute",
    options.apiKey,
    requestBody,
  );

  if (options.json) {
    outputResult(response, true);
    return;
  }

  console.log("Test execution started successfully!");
  console.log("Test Report URL:", response.testReportUrl);
  console.log("Report Status:", response.testReport.status);

  if (response.testReport.testResults.length > 0) {
    console.log("\nTest Results:");
    response.testReport.testResults.forEach((result) => {
      console.log(`- Test ${result.testCaseId}: ${result.status}`);
      if (result.errorMessage) {
        console.log(`  Error: ${result.errorMessage}`);
      }
      if (result.traceUrl) {
        console.log(`  Trace: ${result.traceUrl}`);
      }
    });
  }
}

export async function getTestReport(options: GetTestReportOptions) {
  if (!options.apiKey) {
    console.error("API key is required");
    process.exit(1);
  }

  const response = await apiCall<TestReport>(
    "get",
    `/apiKey/v2/test-targets/${options.testTargetId}/test-reports/${options.reportId}`,
    options.apiKey,
  );

  if (options.json) {
    outputResult(response, true);
    return;
  }

  console.log("Test Report Details:");
  console.log("Status:", response.status);
  console.log("Execution URL:", response.executionUrl);

  if (response.testResults.length > 0) {
    console.log("\nTest Results:");
    response.testResults.forEach((result) => {
      console.log(`- Test ${result.testCaseId}: ${result.status}`);
      if (result.errorMessage) {
        console.log(`  Error: ${result.errorMessage}`);
      }
      if (result.traceUrl) {
        console.log(`  Trace: ${result.traceUrl}`);
      }
    });
  }
}

export async function registerLocation(options: RegisterLocationOptions) {
  if (!options.apiKey) {
    console.error("API key is required");
    process.exit(1);
  }

  const requestBody: RegisterRequest = {
    name: options.name,
    registrationData: {
      proxypass: options.proxypass,
      proxyuser: options.proxyuser,
      address: options.address,
    },
  };

  const response = await apiCall<SuccessResponse>(
    "put",
    "/apiKey/v1/private-location/register",
    options.apiKey,
    requestBody,
  );

  if (options.json) {
    outputResult(response, true);
    return;
  }

  console.log("Registration result:", response.success ? "Success" : "Failed");
}

export async function unregisterLocation(options: UnregisterLocationOptions) {
  if (!options.apiKey) {
    console.error("API key is required");
    process.exit(1);
  }

  const requestBody: UnregisterRequest = {
    name: options.name,
  };

  const response = await apiCall<SuccessResponse>(
    "put",
    "/apiKey/v1/private-location/unregister",
    options.apiKey,
    requestBody,
  );

  if (options.json) {
    outputResult(response, true);
    return;
  }

  console.log(
    "Unregistration result:",
    response.success ? "Success" : "Failed",
  );
}

export async function listPrivateLocations(
  options: ListPrivateLocationsOptions,
) {
  if (!options.apiKey) {
    console.error("API key is required");
    process.exit(1);
  }

  const response = await apiCall<PrivateLocationInfo[]>(
    "get",
    "/apiKey/v1/private-location",
    options.apiKey,
  );

  if (options.json) {
    outputResult(response, true);
    return;
  }

  console.log("Private Locations:");
  response.forEach((location) => {
    console.log(`- Name: ${location.name}`);
    console.log(`  Status: ${location.status}`);
    console.log(`  Address: ${location.address}`);
  });
}

export async function listEnvironments(options: ListEnvironmentsOptions) {
  if (!options.apiKey) {
    console.error("API key is required");
    process.exit(1);
  }

  const response = await apiCall<Environment[]>(
    "get",
    `/apiKey/v2/test-targets/${options.testTargetId}/environments`,
    options.apiKey,
  );

  if (options.json) {
    outputResult(response, true);
    return;
  }

  console.log("Environments:");
  response.forEach((environment) => {
    console.log(`- Name: ${environment.name}`);
    console.log(`  ID: ${environment.id}`);
    console.log(`  Discovery URL: ${environment.discoveryUrl}`);
    console.log(`  Updated At: ${environment.updatedAt}`);
  });
}

export async function createEnvironment(options: CreateEnvironmentOptions) {
  if (!options.apiKey) {
    console.error("API key is required");
    process.exit(1);
  }

  const requestBody = {
    name: options.name,
    discoveryUrl: options.discoveryUrl,
    testAccount: options.testAccount,
    basicAuth: options.basicAuth,
    privateLocationName: options.privateLocationName,
    additionalHeaderFields: options.additionalHeaderFields,
  };

  const response = await apiCall<Environment>(
    "post",
    `/apiKey/v2/test-targets/${options.testTargetId}/environments`,
    options.apiKey,
    requestBody,
  );

  if (options.json) {
    outputResult(response, true);
    return;
  }

  console.log("Environment created successfully!");
  console.log(`- Name: ${response.name}`);
  console.log(`  ID: ${response.id}`);
  console.log(`  Discovery URL: ${response.discoveryUrl}`);
  console.log(`  Updated At: ${response.updatedAt}`);
}

export async function updateEnvironment(options: UpdateEnvironmentOptions) {
  if (!options.apiKey) {
    console.error("API key is required");
    process.exit(1);
  }

  const requestBody = {
    name: options.name,
    discoveryUrl: options.discoveryUrl,
    testAccount: options.testAccount,
    basicAuth: options.basicAuth,
    privateLocationName: options.privateLocationName,
    additionalHeaderFields: options.additionalHeaderFields,
  };

  const response = await apiCall<Environment>(
    "patch",
    `/apiKey/v2/test-targets/${options.testTargetId}/environments/${options.environmentId}`,
    options.apiKey,
    requestBody,
  );

  if (options.json) {
    outputResult(response, true);
    return;
  }

  console.log("Environment updated successfully!");
  console.log(`- Name: ${response.name}`);
  console.log(`  ID: ${response.id}`);
  console.log(`  Discovery URL: ${response.discoveryUrl}`);
  console.log(`  Updated At: ${response.updatedAt}`);
}

export async function deleteEnvironment(options: DeleteEnvironmentOptions) {
  if (!options.apiKey) {
    console.error("API key is required");
    process.exit(1);
  }

  await apiCall<void>(
    "delete",
    `/apiKey/v2/test-targets/${options.testTargetId}/environments/${options.environmentId}`,
    options.apiKey,
  );

  if (options.json) {
    outputResult({ success: true }, true);
    return;
  }

  console.log("Environment deleted successfully!");
}

function createCommandWithCommonOptions(command: string) {
  return program
    .command(command)
    .requiredOption("-k, --api-key <key>", "Octomind API key")
    .option("-j, --json", "Output raw JSON response");
}

export function run() {
  // CLI program setup
  program
    .name("octomind-cli")
    .description(
      "Octomind CLI tool. see https://octomind.dev/docs/api-reference/",
    );

  createCommandWithCommonOptions("execute")
    .description("Execute test cases")
    .requiredOption("-t, --test-target-id <id>", "Test target ID")
    .requiredOption("-u, --url <url>", "URL to test")
    .option("-e, --environment <name>", "Environment name", "default")
    .option("-d, --description <text>", "Test description")
    .action(executeTests);

  createCommandWithCommonOptions("report")
    .description("Get test report details")
    .requiredOption("-t, --test-target-id <id>", "Test target ID")
    .requiredOption("-r, --report-id <id>", "Test report ID")
    .action(getTestReport);

  createCommandWithCommonOptions("register-location")
    .description("Register a private location")
    .requiredOption("-n, --name <name>", "Location name")
    .requiredOption("-p, --proxypass <password>", "Proxy password")
    .requiredOption("-u, --proxyuser <user>", "Proxy user")
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
    .option("--additional-header-fields <fields>", "Additional header fields")
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
    .option("--additional-header-fields <fields>", "Additional header fields")
    .action(updateEnvironment);

  createCommandWithCommonOptions("delete-environment")
    .description("Delete an environment")
    .requiredOption("-t, --test-target-id <id>", "Test target ID")
    .requiredOption("-e, --environment-id <id>", "Environment ID")
    .action(deleteEnvironment);

  program.parse();
}
