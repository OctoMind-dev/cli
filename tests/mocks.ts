import { SyncTestCase } from "../src/tools/sync/types";

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
