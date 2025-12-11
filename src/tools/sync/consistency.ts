import { SyncTestCase } from "./types";

export const checkForConsistency = (testCases: SyncTestCase[]): void => {
  const allStableIds = new Set(testCases.map((tc) => tc.id));
  const allDependencyIds = testCases
    .map((tc) => tc.dependencyId)
    .filter((id): id is string => !!id);
  const allTeardownIds = testCases
    .map((tc) => tc.teardownId)
    .filter((id): id is string => !!id);

  for (const dependencyId of allDependencyIds) {
    if (!allStableIds.has(dependencyId)) {
      throw new Error(`dependency not found ${dependencyId}`);
    }
  }

  for (const teardownId of allTeardownIds) {
    if (!allStableIds.has(teardownId)) {
      throw new Error(`tear down not found ${teardownId}`);
    }
  }

  const seenStableIds: Set<string> = new Set();
  for (const testCase of testCases) {
    if (seenStableIds.has(testCase.id)) {
      throw new Error(`duplicate id ${testCase.id}`);
    }
    seenStableIds.add(testCase.id);
  }

  const testCasesById = new Map<string, SyncTestCase>(
    testCases.map((tc) => [tc.id, tc]),
  );

  for (const testCase of testCases) {
    const seenDependencyIds: string[] = [];
    let iterationTestCase: SyncTestCase | undefined = testCase;
    while (iterationTestCase?.dependencyId) {
      if (seenDependencyIds.includes(iterationTestCase.id)) {
        throw new Error(
          `loop detected, [${iterationTestCase.id}] -> [${seenDependencyIds.reverse().join("] -> [")}]`,
        );
      }
      seenDependencyIds.push(iterationTestCase.id);
      iterationTestCase = testCasesById.get(iterationTestCase.dependencyId);
    }
  }

  return undefined;
};
