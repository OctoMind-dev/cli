import fs, { writeFileSync } from "fs";
import path from "path";

import open from "open";
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
const getTestCaseToEdit = async (
  versionId: string,
  testCaseToEdit: SyncTestCase,
  options: EditOptions,
) => {
  return await client.GET(
    "/apiKey/beta/test-targets/{testTargetId}/test-cases/{testCaseId}/versions/{versionId}",
    {
      params: {
        path: {
          versionId,
          testCaseId: testCaseToEdit.id,
          testTargetId: options.testTargetId,
        },
      },
    },
  );
};
export const edit = async (options: EditOptions): Promise<void> => {
  const octomindRoot = await findOctomindFolder();
  if (!octomindRoot) {
    throw new Error(
      `Could not find ${OCTOMIND_FOLDER_NAME} folder, make sure to pull before trying to edit`,
    );
  }

  console.log({ octomindRoot });
  const testCaseFilePath = await getAbsoluteFilePathInOctomindRoot({
    octomindRoot,
    filePath: options.filePath,
  });
  console.log({ testCaseFilePath });

  if (!testCaseFilePath) {
    throw new Error(
      `Could not find ${options.filePath} in folder ${octomindRoot}`,
    );
  }

  const testCaseToEdit = {
    ...loadTestCase(testCaseFilePath),
    localEditingStatus: "IN_PROGRESS",
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

  const versionId = response?.versionIdByStableId[testCaseToEdit.id];

  if (!versionId) {
    throw new Error(`Could not edit test case with id '${testCaseToEdit.id}'`);
  }

  const parsedBaseUrl = URL.parse(BASE_URL);
  const localEditingUrl = `${parsedBaseUrl?.protocol}//${parsedBaseUrl?.host}/testtargets/${options.testTargetId}/testcases/${versionId}/localEdit?detailsPanelRail=steps&testTargetId=${options.testTargetId}&testCaseId=${versionId}`;
  await open(localEditingUrl);

  console.log(
    `Navigating to local editing url, open it manually if a browser didn't open already: ${localEditingUrl}`,
  );

  let localTestCase = await getTestCaseToEdit(
    versionId,
    testCaseToEdit,
    options,
  );

  while (localTestCase.data?.localEditingStatus === "IN_PROGRESS") {
    await sleep(POLLING_INTERVAL);
    console.log("Waiting for local editing to finish...");

    localTestCase = await getTestCaseToEdit(versionId, testCaseToEdit, options);
  }

  await writeSingleTestCaseYaml(testCaseFilePath, {
    ...localTestCase.data,
    id: testCaseToEdit.id,
    localEditingStatus: undefined,
    versionId: undefined,
  });

  console.log("Edited test case successfully!");
};
