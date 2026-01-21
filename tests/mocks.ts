import { vi } from "vitest";

import {
  EnvironmentResponse,
  TestCaseResponse,
  TestReport,
} from "../src/tools";
import { SyncDataByStableId, SyncTestCase } from "../src/tools/sync/types";

export const createMockSyncTestCase = (
  overrides?: Partial<SyncTestCase>,
): SyncTestCase => ({
  id: crypto.randomUUID(),
  description: "some description",
  elements: [],
  version: "1",
  prompt: "prompt",
  runStatus: "ON",
  ...overrides,
});

export const createMockEnvironment = (
  overrides?: Partial<EnvironmentResponse>,
): EnvironmentResponse => ({
  additionalHeaderFields: undefined,
  basicAuth: undefined,
  discoveryUrl: "",
  id: "defaultId",
  name: "DEFAULT",
  privateLocation: {},
  testAccount: undefined,
  testTargetId: "",
  type: "DEFAULT",
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockTestCase = (
  overrides?: Partial<TestCaseResponse>,
): TestCaseResponse => ({
  createdAt: new Date().toISOString(),
  createdBy: "EDIT",
  description: "some test case",
  discovery: undefined,
  elements: [],
  entryPointUrlPath: undefined,
  externalId: undefined,
  folderId: undefined,
  id: "test-case-id",
  prerequisiteId: undefined,
  proposalRunId: undefined,
  runStatus: undefined,
  status: "ENABLED",
  tags: [],
  teardownTestCaseId: undefined,
  testTargetId: "testTargetId",
  type: null,
  updatedAt: new Date().toISOString(),
  version: "1",
  ...overrides,
});

export const createMockTestReport = (
  overrides?: Partial<TestReport>,
): TestReport => ({
  breakpoint: undefined,
  browser: undefined,
  context: {
    source: "github",
    sha: "someGitHash",
  },
  createdAt: "",
  executionUrl: "",
  id: "",
  status: "PASSED",
  testResults: [],
  testTargetId: "",
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockDraftPushResponse = (
  testCaseId: string,
  overrides?: Partial<SyncDataByStableId[string]>,
): {
  success: boolean;
  versionIds: string[];
  syncDataByStableId: SyncDataByStableId;
} => ({
  success: true,
  versionIds: [],
  syncDataByStableId: {
    [testCaseId]: { versionId: "version-123", ...overrides },
  },
});
