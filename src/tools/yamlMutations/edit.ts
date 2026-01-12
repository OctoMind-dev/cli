import fs from "fs";
import path from "path";

import yaml from "yaml";

import { client, handleError } from "../client";
import { checkForConsistency } from "../sync/consistency";
import { draftPush } from "../sync/push";
import { SyncTestCase } from "../sync/types";
import { readTestCasesFromDir } from "../sync/yml";
import { findOctomindFolder, getAbsoluteFilePathInOctomindRoot } from "../../helpers";

type EditOptions = {
  testTargetId: string;
  filePath: string;
};


const getRelevantTestCases = (
  testCasesById: Record<string, SyncTestCase>,
  startTestCase: SyncTestCase,
): SyncTestCase[] => {
  let dependencyId = startTestCase.dependencyId;
  const result: SyncTestCase[] = [startTestCase];

  while (dependencyId) {
    const currentTestCase = testCasesById[dependencyId];

    if (!currentTestCase) {
      throw new Error(
        `Could not find dependency ${dependencyId} for ${startTestCase.id}`,
      );
    }

    result.push(currentTestCase);
    dependencyId = currentTestCase?.dependencyId;
  }

  return result;
};

const loadTestCase = (testCasePath: string): SyncTestCase => {
  try {
    const content = fs.readFileSync(testCasePath, "utf8");
    return yaml.parse(content);
  } catch (error) {
    throw new Error(`Could not parse ${testCasePath}: ${error}`);
  }
};

export const edit = async (options: EditOptions): Promise<void> => {
  const octomindRoot = await findOctomindFolder();
  if (!octomindRoot) {
    throw new Error(
      "Could not find .octomind folder, make sure to pull before trying to edit",
    );
  }
  const testCaseFilePath = getAbsoluteFilePathInOctomindRoot({ octomindRoot, filePath: options.filePath })
  if (!testCaseFilePath) {
    throw new Error(`Could not find ${options.filePath} in folder ${octomindRoot}`)
  }

  const testCaseToEdit = loadTestCase(testCaseFilePath);

  const testCases = readTestCasesFromDir(octomindRoot);
  const testCasesById = Object.fromEntries(testCases.map((tc) => [tc.id, tc]));
  const relevantTestCases = getRelevantTestCases(testCasesById, testCaseToEdit);

  checkForConsistency(relevantTestCases);

  const response = await draftPush(
    {
      testCases: relevantTestCases,
    },
    {
      testTargetId: options.testTargetId,
      client,
      onError: handleError,
    },
  );

  console.log(response);
};
