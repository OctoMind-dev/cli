import { OCTOMIND_FOLDER_NAME } from "../../constants";
import {
  findOctomindFolder,
  getAbsoluteFilePathInOctomindRoot,
} from "../../helpers";
import { client, handleError } from "../client";
import { checkForConsistency } from "../sync/consistency";
import { draftPush } from "../sync/push";
import { SyncTestCase } from "../sync/types";
import { readTestCasesFromDir } from "../sync/yaml";
import { getRelevantTestCases, loadTestCase } from "./getRelevantTestCases";

type CreateOptions = {
  testTargetId: string;
  name: string;
  dependencyPath?: string;
};

const getDependecyTestCases = async ({
  octomindRoot,
  dependencyPath,
}: {
  octomindRoot: string;
  dependencyPath: string;
}): Promise<{
  dependencyTestCase: SyncTestCase;
  relevantTestCases: SyncTestCase[];
}> => {
  const dependencyFilePath = await getAbsoluteFilePathInOctomindRoot({
    octomindRoot,
    filePath: dependencyPath,
  });

  if (!dependencyFilePath) {
    throw new Error(
      `Could not find dependency test case ${dependencyPath} in folder ${octomindRoot}`,
    );
  }
  const dependencyTestCase = loadTestCase(dependencyFilePath);

  const testCases = readTestCasesFromDir(octomindRoot);
  const testCasesById = Object.fromEntries(testCases.map((tc) => [tc.id, tc]));

  const relevantTestCases = getRelevantTestCases(
    testCasesById,
    dependencyTestCase,
  );
  checkForConsistency(relevantTestCases);
  return { dependencyTestCase, relevantTestCases };
};

export const create = async (options: CreateOptions): Promise<void> => {
  const octomindRoot = await findOctomindFolder();
  if (!octomindRoot) {
    throw new Error(
      `Could not find ${OCTOMIND_FOLDER_NAME} folder, make sure to pull before trying to create a test case`,
    );
  }

  let dependencyId: string | undefined = undefined;
  const testCasesToPush: SyncTestCase[] = [];
  if (options.dependencyPath) {
    const { dependencyTestCase, relevantTestCases } =
      await getDependecyTestCases({
        octomindRoot,
        dependencyPath: options.dependencyPath,
      });
    dependencyId = dependencyTestCase.id;
    testCasesToPush.push(...relevantTestCases);
  }

  const newTestCase: SyncTestCase = {
    version: "1",
    id: crypto.randomUUID(),
    dependencyId,
    elements: [],
    runStatus: "OFF",
    description: options.name,
    prompt: "",
    localEditingStatus: "IN_PROGRESS" as const,
  };
  testCasesToPush.push(newTestCase);

  const response = await draftPush(
    {
      testCases: [newTestCase],
    },
    {
      testTargetId: options.testTargetId,
      client,
      onError: handleError,
    },
  );

  console.log(response);
};
