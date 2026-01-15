import { SyncTestCase } from "../sync/types";

type LinkedTestCaseId = {
  id: string;
  linkType: "dependency" | "teardown";
  sourceTestCaseId: string;
};

const getLinkedTestCaseIds = (testCase: SyncTestCase): LinkedTestCaseId[] => {
  const links: LinkedTestCaseId[] = [];

  if (testCase.dependencyId) {
    links.push({
      id: testCase.dependencyId,
      linkType: "dependency",
      sourceTestCaseId: testCase.id,
    });
  }

  if (testCase.teardownId) {
    links.push({
      id: testCase.teardownId,
      linkType: "teardown",
      sourceTestCaseId: testCase.id,
    });
  }

  return links;
};

const resolveLinkedTestCase = (
  testCasesById: Record<string, SyncTestCase>,
  link: LinkedTestCaseId,
): SyncTestCase => {
  const testCase = testCasesById[link.id];

  if (!testCase) {
    throw new Error(
      `Could not find ${link.linkType} ${link.id} for ${link.sourceTestCaseId}`,
    );
  }

  return testCase;
};

export const getRelevantTestCases = (
  testCasesById: Record<string, SyncTestCase>,
  startTestCase: SyncTestCase,
): SyncTestCase[] => {
  const visited = new Set<string>();
  const result: SyncTestCase[] = [];
  const queue: SyncTestCase[] = [startTestCase];

  let currentTestCase = queue.shift();
  while (currentTestCase) {
    if (!visited.has(currentTestCase.id)) {
      visited.add(currentTestCase.id);
      result.push(currentTestCase);

      const links = getLinkedTestCaseIds(currentTestCase);
      for (const link of links) {
        if (!visited.has(link.id)) {
          const linkedTestCase = resolveLinkedTestCase(testCasesById, link);
          queue.push(linkedTestCase);
        }
      }
    }

    currentTestCase = queue.shift();
  }

  return result;
};
