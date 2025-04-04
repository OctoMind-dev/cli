export interface ExecutionContext {
  source:
    | "manual"
    | "github"
    | "azureDevOps"
    | "discovery"
    | "scheduled"
    | "proposal";
  description?: string;
  triggeredBy?: {
    type: "USER" | "INITIAL";
    userId?: string;
  };
}

export interface TestTargetExecutionRequest {
  testTargetId: string;
  url: string;
  context: ExecutionContext;
  environmentName?: string;
  tags?: string[];
  variablesToOverwrite?: Record<string, string[]>;
}

export interface TestResult {
  id: string;
  testTargetId: string;
  testCaseId: string;
  status: "WAITING" | "PASSED" | "FAILED" | "ERROR";
  errorMessage?: string;
  traceUrl?: string;
}

export interface TestReport {
  id: string;
  testTargetId: string;
  status: "WAITING" | "PASSED" | "FAILED";
  executionUrl: string;
  testResults: TestResult[];
}

export interface TestReportResponse {
  testReportUrl: string;
  testReport: TestReport;
}

export interface RegisterRequest {
  name: string;
  registrationData: {
    proxypass: string;
    proxyuser: string;
    address: string;
  };
}

export interface UnregisterRequest {
  name: string;
}

export interface SuccessResponse {
  success: boolean;
}

export interface ExecuteTestsOptions {
  apiKey: string;
  testTargetId: string;
  url: string;
  environment?: string;
  description?: string;
  json?: boolean;
  tags?: string[];
  variablesToOverwrite?: Record<string, string[]>;
}

export interface GetTestReportOptions {
  apiKey: string;
  testTargetId: string;
  reportId: string;
  json?: boolean;
}

export interface RegisterLocationOptions {
  apiKey: string;
  name: string;
  proxypass: string;
  proxyuser: string;
  address: string;
  json?: boolean;
}

export interface UnregisterLocationOptions {
  apiKey: string;
  name: string;
  json?: boolean;
}

export interface ListPrivateLocationsOptions {
  apiKey: string;
  json?: boolean;
}

export interface PrivateLocationInfo {
  status: "OFFLINE" | "ONLINE";
  address: string;
  name: string;
}

export interface Environment {
  id: string;
  name: string;
  testTargetId: string;
  updatedAt: string;
  type: string;
  discoveryUrl: string;
  additionalHeaderFields?: Record<string, string>;
  testAccount?: {
    username: string;
    password: string;
    otpInitializerKey?: string;
    updatedAt: string;
  };
  basicAuth?: {
    username: string;
    password: string;
    updatedAt: string;
  };
  privateLocation?: {
    id: string;
    name: string;
    status: string;
    type: string;
  };
}

export interface ListEnvironmentsOptions {
  apiKey: string;
  testTargetId: string;
  json?: boolean;
}

export interface CreateEnvironmentOptions {
  apiKey: string;
  testTargetId: string;
  name: string;
  discoveryUrl: string;
  testAccount?: {
    username: string;
    password: string;
    otpInitializerKey?: string;
  };
  basicAuth?: {
    username: string;
    password: string;
  };
  privateLocationName?: string;
  additionalHeaderFields?: Record<string, string>;
  json?: boolean;
}

export interface UpdateEnvironmentOptions {
  apiKey: string;
  testTargetId: string;
  environmentId: string;
  name?: string;
  discoveryUrl?: string;
  testAccount?: {
    username: string;
    password: string;
    otpInitializerKey?: string;
  };
  basicAuth?: {
    username: string;
    password: string;
  };
  privateLocationName?: string;
  additionalHeaderFields?: Record<string, string>;
  json?: boolean;
}

export interface DeleteEnvironmentOptions {
  apiKey: string;
  testTargetId: string;
  environmentId: string;
  json?: boolean;
}

export interface Notification {
  id: string;
  testTargetId: string;
  createdAt: string;
  updatedAt: string;
  payload: {
    failed?: boolean;
    context?: ExecutionContext;
    testReportId?: string;
    testCaseId?: string;
  };
  type: "REPORT_EXECUTION_FINISHED" | "VALIDATION_PASSED";
  ack?: "IN_WEB_APP" | null;
}

export interface TestCase {
  id: string;
  testTargetId: string;
  type: string | null;
  elements: Array<{
    id: string;
    index: number;
    interaction?: {
      id: string;
      action:
        | "EXTRACT"
        | "ENTER_TEXT"
        | "CLICK"
        | "SELECT_OPTION"
        | "TYPE_TEXT"
        | "KEY_PRESS"
        | "HOVER"
        | "UPLOAD"
        | "GO_TO"
        | "DRAG_AND_DROP"
        | "CLOSE_PAGE"
        | "OPEN_EMAIL";
      calledWith?: string | null;
      testCaseElementId: string;
    } | null;
    assertion?: {
      id: string;
      expectation:
        | "VISIBLE"
        | "NOT_VISIBLE"
        | "TO_BE_CHECKED"
        | "NOT_TO_BE_CHECKED"
        | "TO_HAVE_VALUE"
        | "TO_CONTAIN_TEXT"
        | "TO_HAVE_STYLE";
      calledWith?: string | null;
      testCaseElementId: string;
    } | null;
    scrollState: null;
    selectors: Array<{
      id: string;
      index: number;
      selector: string;
      selectorType: "TEXT" | "LABEL" | "PLACEHOLDER" | "ROLE";
      options?: { name?: string } | null;
      testCaseElementId: string;
      scrollStateId: string | null;
    }>;
    testCaseId: string;
    ignoreFailure: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
  description: string;
  status: "ENABLED" | "DRAFT";
  externalId: string | null;
  entryPointUrlPath: string | null;
  tags: string[];
  createdBy: "EDIT";
  runStatus: "ON" | "OFF";
  prerequisiteId: string | null;
  proposalRunId: string | null;
  folderId: string | null;
  discovery?: {
    id: string;
    freePrompt: string;
    traceUrl: string | null;
    traceJsonManifestUrl: string | null;
    status: "OUTDATED";
    abortCause: string | null;
    message: string | null;
    testCaseId: string;
    lastJobExecutionName: string | null;
    createdAt: string;
    updatedAt: string;
    executedTestCaseElements: string[];
    testCase: {
      id: string;
      testTargetId: string;
      description: string;
      createdAt: string;
      updatedAt: string;
      entryPointUrlPath: string | null;
      type: string | null;
      status: "ENABLED";
      runStatus: "ON";
      interactionStatus: "NEW";
      createdBy: "EDIT";
      proposalRunId: string | null;
      externalId: string | null;
      folderId: string | null;
      prerequisiteId: string | null;
      predecessorId: string;
      testTarget: {
        id: string;
        app: string;
        createdAt: string;
        updatedAt: string;
        orgId: string;
        testIdAttribute: string | null;
        timeoutPerStep: number;
      };
    };
  };
}

export interface GetNotificationsOptions {
  apiKey: string;
  testTargetId: string;
  json?: boolean;
}

export interface GetTestCaseOptions {
  apiKey: string;
  testTargetId: string;
  testCaseId: string;
  json?: boolean;
}

export interface CreateDiscoveryOptions {
  apiKey: string;
  testTargetId: string;
  name: string;
  prompt: string;
  entryPointUrlPath?: string;
  prerequisiteId?: string;
  externalId?: string;
  assignedTagIds?: string[];
  folderId?: string;
  json?: boolean;
}

export interface DiscoveryResponse {
  discoveryId: string;
  testCaseId: string;
}
