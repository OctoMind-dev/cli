import path from "node:path";

import { createTwoFilesPatch } from "diff";
import open from "open";
import yaml from "yaml";

import { OCTOMIND_FOLDER_NAME } from "../../constants";
import {
  findOctomindFolder,
  getAbsoluteFilePathInOctomindRoot,
} from "../../helpers";
import { BASE_URL, client, handleError } from "../client";
import { checkForConsistency } from "../sync/consistency";
import { draftPush } from "../sync/push";
import { SyncDataByStableId, SyncTestCase } from "../sync/types";
import {
  buildFilename,
  buildFolderName,
  readTestCasesFromDir,
  writeSingleTestCaseYaml,
} from "../sync/yaml";
import { getRelevantTestCases, loadTestCase } from "./getRelevantTestCases";
import { waitForLocalChangesToBeFinished } from "./waitForLocalChanges";

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
  return { dependencyTestCase, relevantTestCases };
};

const openBrowserAndPoll = async ({
  newTestCase,
  syncData,
  testTargetId,
}: {
  newTestCase: SyncTestCase;
  syncData: SyncDataByStableId[number];
  testTargetId: string;
}) => {
  const { versionId } = syncData;

  const parsedBaseUrl = URL.parse(BASE_URL);
  const localEditingUrl = new URL(
    `${parsedBaseUrl?.protocol}//${parsedBaseUrl?.host}/testtargets/${testTargetId}/testcases/${versionId}/localEdit`,
  );

  await open(localEditingUrl.href);

  console.log(
    `Navigating to local url, open it manually if a browser didn't open already: ${localEditingUrl}`,
  );

  const createResult = await waitForLocalChangesToBeFinished(
    versionId,
    newTestCase,
    { testTargetId },
  );
  return createResult;
};

const writeOutput = async ({
  testCaseFilePath,
  createResult,
}: {
  testCaseFilePath: string;
  createResult: SyncTestCase | "cancelled";
}): Promise<void> => {
  if (createResult === "cancelled") {
    console.log("Cancelled editing test case, exiting");
    return;
  }

  await writeSingleTestCaseYaml(testCaseFilePath, createResult);

  const diff = createTwoFilesPatch(
    "old.yaml",
    "new.yaml",
    "",
    yaml.stringify(createResult),
  );

  console.log(`Edited test case successfully`);
  console.log(diff);
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
  checkForConsistency(testCasesToPush);

  const response = await draftPush(
    {
      testCases: testCasesToPush,
    },
    {
      testTargetId: options.testTargetId,
      client,
      onError: handleError,
    },
  );

  if (!response) {
    throw new Error(
      `Could not create new test case with id '${newTestCase.id}'`,
    );
  }
  const syncData = response.syncDataByStableId[newTestCase.id];
  if (!syncData) {
    throw new Error(`Could not create test case with id '${newTestCase.id}'`);
  }

  const createResult = await openBrowserAndPoll({
    newTestCase,
    syncData,
    testTargetId: options.testTargetId,
  });

  const testCaseFolder = buildFolderName(newTestCase, testCasesToPush, octomindRoot)
  const newTestCaseName = buildFilename(newTestCase, octomindRoot)
  const newTestCasePath = path.join(testCaseFolder, newTestCaseName)
  await writeOutput({ createResult, testCaseFilePath: newTestCasePath });
};
