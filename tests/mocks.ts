import { SyncTestCase } from "../src/tools/sync/types";

export const createMockSyncTestCase = (
    overrides?: Partial<SyncTestCase>,
): SyncTestCase => ({
    id: "someStableId",
    description: "some description",
    elements: [],
    tagNames: [],
    version: "1",
    prompt: "prompt",
    runStatus: "ON",
    ...overrides,
});