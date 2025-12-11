import { components } from "../../api";

export type TestTargetSyncData = components["schemas"]["TestTargetSyncSchema"];
export type SyncTestCases = TestTargetSyncData["testCases"];
export type SyncTestCase = SyncTestCases[number];
export type ExecutionContext = components["schemas"]["ExecutionContext"];
