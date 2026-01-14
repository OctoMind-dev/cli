import fs from "fs";

import { createTwoFilesPatch } from "diff";
import open from "open";
import ora from "ora";
import yaml from "yaml";

import { OCTOMIND_FOLDER_NAME } from "../../constants";
import {
  findOctomindFolder,
  getAbsoluteFilePathInOctomindRoot,
  sleep,
} from "../../helpers";
import { BASE_URL, client, handleError } from "../client";
import { checkForConsistency } from "../sync/consistency";
import { draftPush } from "../sync/push";
import { SyncTestCase } from "../sync/types";
import { readTestCasesFromDir, writeSingleTestCaseYaml } from "../sync/yml";

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

const POLLING_INTERVAL = 1000;
const getTestCaseVersion = async (
  versionId: string,
  testCase: SyncTestCase,
  options: EditOptions,
) => {
  return await client.GET(
    "/apiKey/beta/test-targets/{testTargetId}/test-cases/{testCaseId}/versions/{versionId}",
    {
      params: {
        path: {
          versionId,
          testCaseId: testCase.id,
          testTargetId: options.testTargetId,
        },
      },
    },
  );
};

const waitForLocalEditingToBeFinished = async (
  versionId: string,
  testCaseToEdit: SyncTestCase,
  options: EditOptions,
): Promise<SyncTestCase | "cancelled"> => {
  let localTestCase = await getTestCaseVersion(
    versionId,
    testCaseToEdit,
    options,
  );

  if (!localTestCase.data) {
    throw new Error(
      `Could not get local editing status for test case ${testCaseToEdit.id}`,
    );
  }

  const throbber = ora("Waiting for editing to finish in UI").start();
  while (localTestCase.data.localEditingStatus === "IN_PROGRESS") {
    await sleep(POLLING_INTERVAL);

    localTestCase = await getTestCaseVersion(
      versionId,
      testCaseToEdit,
      options,
    );
    if (!localTestCase.data) {
      throw new Error(
        `Could not get local editing status for test case ${testCaseToEdit.id}`,
      );
    }

    if (localTestCase.data.localEditingStatus === "CANCELLED") {
      throbber.fail("cancelled by user");
      return "cancelled";
    }
  }

  throbber.succeed("Finished editing in UI");

  const syncTestCaseWithoutExtraProperties: SyncTestCase & {
    versionId: undefined;
  } = {
    ...localTestCase.data,
    id: testCaseToEdit.id,
    localEditingStatus: undefined,
    versionId: undefined,
  };

  return syncTestCaseWithoutExtraProperties;
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

  const versionId = response.versionIdByStableId[testCaseToEdit.id];
  if (!versionId) {
    throw new Error(`Could not edit test case with id '${testCaseToEdit.id}'`);
  }
  const parsedBaseUrl = URL.parse(BASE_URL);
  const localEditingUrl = `${parsedBaseUrl?.protocol}//${parsedBaseUrl?.host}/testtargets/${options.testTargetId}/testcases/${versionId}/localEdit?detailsPanelRail=steps&testTargetId=${options.testTargetId}&testCaseId=${versionId}`;
  await open(localEditingUrl);

  console.log(
    `Navigating to local editing url, open it manually if a browser didn't open already: ${localEditingUrl}`,
  );

  const editResult = await waitForLocalEditingToBeFinished(
    versionId,
    testCaseToEdit,
    options,
  );

  if (editResult === "cancelled") {
    console.log("Cancelled editing test case, exiting");
    return;
  }

  await writeSingleTestCaseYaml(testCaseFilePath, editResult);

  const diff = createTwoFilesPatch(
    "old.yaml",
    "new.yaml",
    yaml.stringify(originalTestCase),
    yaml.stringify(editResult),
  );

  console.log(`Edited test case successfully`);
  console.log(diff);
};
