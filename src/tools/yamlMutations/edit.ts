import { createTwoFilesPatch } from "diff";
import open from "open";
import yaml from "yaml";

import { OCTOMIND_FOLDER_NAME } from "../../constants";
import {
  findOctomindFolder,
  getAbsoluteFilePathInOctomindRoot,
} from "../../helpers";
import { logger } from "../../logger";
import { BASE_URL, client, handleError } from "../client";
import { checkForConsistency } from "../sync/consistency";
import { draftPush } from "../sync/push";
import {
  loadTestCase,
  readTestCasesFromDir,
  writeSingleTestCaseYaml,
} from "../sync/yaml";
import { getRelevantTestCases } from "./getRelevantTestCases";
import { waitForLocalChangesToBeFinished } from "./waitForLocalChanges";

type EditOptions = {
  testTargetId: string;
  filePath: string;
};

export const edit = async (options: EditOptions): Promise<void> => {
  const octomindRoot = await findOctomindFolder();
  if (!octomindRoot) {
    throw new Error(
      `Could not find ${OCTOMIND_FOLDER_NAME} folder, make sure to pull before trying to edit`,
    );
  }

  const testCaseFilePath = await getAbsoluteFilePathInOctomindRoot({
    octomindRoot,
    filePath: options.filePath,
  });

  if (!testCaseFilePath) {
    throw new Error(
      `Could not find ${options.filePath} in folder ${octomindRoot}`,
    );
  }

  const originalTestCase = loadTestCase(testCaseFilePath);
  const testCaseToEdit = {
    ...originalTestCase,
    localEditingStatus: "IN_PROGRESS" as const,
  };

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

  if (!response) {
    throw new Error(`Could not edit test case with id '${testCaseToEdit.id}'`);
  }

  const syncData = response.syncDataByStableId[testCaseToEdit.id];
  if (!syncData) {
    throw new Error(`Could not edit test case with id '${testCaseToEdit.id}'`);
  }
  const { versionId, testResultId } = syncData;

  const localEditingUrl = new URL(
    `${BASE_URL}/testtargets/${options.testTargetId}/testcases/${versionId}/localEdit`,
  );
  if (testResultId) {
    localEditingUrl.searchParams.set("testResultId", testResultId);
  }

  await open(localEditingUrl.href);

  logger.info(
    `Navigating to local editing url, open it manually if a browser didn't open already: ${localEditingUrl}`,
  );

  const editResult = await waitForLocalChangesToBeFinished(
    versionId,
    testCaseToEdit,
    options,
  );

  if (editResult === "cancelled") {
    logger.info("Cancelled editing test case, exiting");
    return;
  }

  await writeSingleTestCaseYaml(testCaseFilePath, editResult);

  const diff = createTwoFilesPatch(
    "old.yaml",
    "new.yaml",
    yaml.stringify(originalTestCase),
    yaml.stringify(editResult),
  );

  logger.info(`Edited test case successfully`);
  logger.info(diff);
};
