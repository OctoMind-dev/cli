import { components, operations } from "../../api";

export type TestTargetSyncData = components["schemas"]["TestTargetSyncSchema"];
export type SyncTestCases = TestTargetSyncData["testCases"];
export type SyncTestCase = SyncTestCases[number];
export type ExecutionContext = components["schemas"]["ExecutionContext"];
export type SyncDataByStableId =
  operations["pushTestTargetDraft"]["responses"]["200"]["content"]["application/json"]["syncDataByStableId"];
