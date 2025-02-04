import axios from 'axios';
import { program } from 'commander';

// Types based on the OpenAPI schema
interface ExecutionContext {
  source: 'manual' | 'github' | 'azureDevOps' | 'discovery' | 'scheduled' | 'proposal';
  description?: string;
  triggeredBy?: {
    type: 'USER' | 'INITIAL';
    userId?: string;
  };
}

interface TestTargetExecutionRequest {
  testTargetId: string;
  url: string;
  context: ExecutionContext;
  environmentName?: string;
}

interface TestResult {
  id: string;
  testTargetId: string;
  testCaseId: string;
  status: 'WAITING' | 'PASSED' | 'FAILED' | 'ERROR';
  errorMessage?: string;
  traceUrl?: string;
}

interface TestReport {
  id: string;
  testTargetId: string;
  status: 'WAITING' | 'PASSED' | 'FAILED';
  executionUrl: string;
  testResults: TestResult[];
}

interface TestReportResponse {
  testReportUrl: string;
  testReport: TestReport;
}

interface RegisterRequest {
  name: string;
  registrationData: {
    proxypass: string;
    proxyuser: string;
    address: string;
  };
}

interface UnregisterRequest {
  name: string;
}

interface SuccessResponse {
  success: boolean;
}

const BASE_URL = 'https://app.octomind.dev/api';

// Helper function for API calls
async function apiCall<T>(
  method: 'get' | 'post' | 'put',
  endpoint: string,
  apiKey: string,
  data?: any
): Promise<T> {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data,
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    return response.data as T;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.data || error.message);
    } else {
      console.error('Error:', error);
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
async function executeTests(options: any) {
  if (!options.apiKey) {
    console.error('API key is required');
    process.exit(1);
  }

  const requestBody: TestTargetExecutionRequest = {
    testTargetId: options.testTargetId,
    url: options.url,
    context: {
      source: 'manual',
      description: options.description || 'CLI execution',
      triggeredBy: {
        type: 'USER',
        userId: 'cli-user'
      }
    },
    environmentName: options.environment
  };

  const response = await apiCall<TestReportResponse>(
    'post',
    '/apiKey/v2/execute',
    options.apiKey,
    requestBody
  );

  if (options.json) {
    outputResult(response, true);
    return;
  }

  console.log('Test execution started successfully!');
  console.log('Test Report URL:', response.testReportUrl);
  console.log('Report Status:', response.testReport.status);
  
  if (response.testReport.testResults.length > 0) {
    console.log('\nTest Results:');
    response.testReport.testResults.forEach(result => {
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

async function getTestReport(options: any) {
  if (!options.apiKey) {
    console.error('API key is required');
    process.exit(1);
  }

  const response = await apiCall<TestReport>(
    'get',
    `/apiKey/v2/test-targets/${options.testTargetId}/test-reports/${options.reportId}`,
    options.apiKey
  );

  if (options.json) {
    outputResult(response, true);
    return;
  }

  console.log('Test Report Details:');
  console.log('Status:', response.status);
  console.log('Execution URL:', response.executionUrl);
  
  if (response.testResults.length > 0) {
    console.log('\nTest Results:');
    response.testResults.forEach(result => {
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

async function registerLocation(options: any) {
  if (!options.apiKey) {
    console.error('API key is required');
    process.exit(1);
  }

  const requestBody: RegisterRequest = {
    name: options.name,
    registrationData: {
      proxypass: options.proxypass,
      proxyuser: options.proxyuser,
      address: options.address
    }
  };

  const response = await apiCall<SuccessResponse>(
    'put',
    '/apiKey/v1/private-location/register',
    options.apiKey,
    requestBody
  );

  if (options.json) {
    outputResult(response, true);
    return;
  }

  console.log('Registration result:', response.success ? 'Success' : 'Failed');
}

async function unregisterLocation(options: any) {
  if (!options.apiKey) {
    console.error('API key is required');
    process.exit(1);
  }

  const requestBody: UnregisterRequest = {
    name: options.name
  };

  const response = await apiCall<SuccessResponse>(
    'put',
    '/apiKey/v1/private-location/unregister',
    options.apiKey,
    requestBody
  );

  if (options.json) {
    outputResult(response, true);
    return;
  }

  console.log('Unregistration result:', response.success ? 'Success' : 'Failed');
}

function createCommandWithCommonOptions(command: string) {
  return program.command(command)
  .requiredOption('-k, --api-key <key>', 'Octomind API key')
  .option('-j, --json', 'Output raw JSON response');
}

// CLI program setup
program
  .name('octomind-cli')
  .description('Octomind CLI tool');

createCommandWithCommonOptions('execute')
  .description('Execute test cases')
  .requiredOption('-t, --test-target-id <id>', 'Test target ID')
  .requiredOption('-u, --url <url>', 'URL to test')
  .option('-e, --environment <name>', 'Environment name', 'default')
  .option('-d, --description <text>', 'Test description')
  .action(executeTests);

createCommandWithCommonOptions('report')
  .description('Get test report details')
  .requiredOption('-t, --test-target-id <id>', 'Test target ID')
  .requiredOption('-r, --report-id <id>', 'Test report ID')
  .action(getTestReport);

createCommandWithCommonOptions('register-location')
  .description('Register a private location')
  .requiredOption('-n, --name <name>', 'Location name')
  .requiredOption('-p, --proxypass <password>', 'Proxy password')
  .requiredOption('-u, --proxyuser <user>', 'Proxy user')
  .requiredOption('-a, --address <address>', 'Location address')
  .action(registerLocation);

createCommandWithCommonOptions('unregister-location')
  .description('Unregister a private location')
  .requiredOption('-n, --name <name>', 'Location name')
  .action(unregisterLocation);

program.parse();