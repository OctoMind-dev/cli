import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

import { Client } from "openapi-fetch";
import { ErrorResponse } from "openapi-typescript-helpers";
import yaml from "yaml";

import { paths } from "../../api";
import { client, handleError } from "../client";
import { checkForConsistency } from "../sync/consistency";
import { draftPush } from "../sync/push";
import { SyncTestCase } from "../sync/types";
import { readTestCasesFromDir } from "../sync/yml";

type EditOptions = {
  testTargetId: string;
  filePath: string;
};

const findOctomindFolder = async (
  startPath: string,
): Promise<string | null> => {
  let currentDir = path.dirname(startPath);

  while (currentDir !== path.parse(currentDir).root) {
    const octomindPath = path.join(currentDir, ".octomind");
    if (
      fs.existsSync(octomindPath) &&
      (await fsPromises.stat(octomindPath)).isDirectory()
    ) {
      return octomindPath;
    }
    currentDir = path.dirname(currentDir);
  }

  const rootOctomind = path.join(currentDir, ".octomind");
  if (
    fs.existsSync(rootOctomind) &&
    (await fsPromises.stat(rootOctomind)).isDirectory()
  ) {
    return rootOctomind;
  }

  return null;
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

const loadTestCase = (path: string): SyncTestCase => {
  try {
    const content = fs.readFileSync(path, "utf8");
    return yaml.parse(content);
  } catch (error) {
    throw new Error(`Could not parse ${path}: ${error}`);
  }
};

export const edit = async (options: EditOptions): Promise<void> => {
  console.log(options)
  const resolvedPath = path.resolve(options.filePath);

  const testCaseToEdit = loadTestCase(resolvedPath);

  const octomindRoot = await findOctomindFolder(options.filePath);

  if (!octomindRoot) {
    throw new Error(
      "Could not find .octomind folder, make sure to pull before trying to edit",
    );
  }

  const testCases = readTestCasesFromDir(octomindRoot);
  const testCasesById = Object.fromEntries(testCases.map((tc) => [tc.id, tc]));
  const relevantTestCases = getRelevantTestCases(testCasesById, testCaseToEdit);

  console.log(relevantTestCases);
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
