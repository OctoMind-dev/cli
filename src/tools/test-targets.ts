import path from "path";

import { getUrl } from "../url";
import { client, handleError, ListOptions, logJson } from "./client";
import { checkForConsistency } from "./sync/consistency";
import { getGitContext } from "./sync/git";
import { TestTargetSyncData } from "./sync/types";
import { readTestCasesFromDir, writeYaml } from "./sync/yml";

export const getTestTargets = async () => {
  const { data, error } = await client.GET("/apiKey/v3/test-targets");

  handleError(error);

  if (!data) {
    throw Error("No test targets found");
  }

  return data;
};

export const listTestTargets = async (options: ListOptions): Promise<void> => {
  const testTargets = await getTestTargets();
  if (options.json) {
    logJson(testTargets);
    return;
  }

  console.log("Test Targets:");

  for (let idx = 0; idx < testTargets.length; idx++) {
    const testTarget = testTargets[idx];
    const idxString = `${idx + 1}. `.padEnd(
      testTargets.length.toString().length + 2,
    );
    const paddingString = " ".repeat(idxString.length);
    console.log(`${idxString}ID: ${testTarget.id}`);
    console.log(`${paddingString}App: ${testTarget.app}`);
    console.log(
      `${paddingString}${await getUrl({
        testTargetId: testTarget.id,
        entityType: "test-target",
      })}`,
    );
  }
};

export const pullTestTarget = async (
  options: { testTargetId: string; destination?: string } & ListOptions,
): Promise<void> => {
  const { data, error } = await client.GET(
    "/apiKey/beta/test-targets/{testTargetId}/pull",
    {
      params: {
        path: {
          testTargetId: options.testTargetId,
        },
      },
    },
  );

  console.log(
    `Pulling test target ${options.testTargetId} to ${options.destination}`,
  );

  handleError(error);

  if (!data) {
    throw Error("No test target found");
  }

  if (options.json) {
    logJson(data);
    return;
  }

  writeYaml(data, options.destination);

  console.log("Test Target pulled successfully");
};

export const pushTestTarget = async (
  options: { testTargetId: string; source?: string } & ListOptions,
): Promise<void> => {
  const sourceDir = options.source
    ? path.resolve(options.source)
    : process.cwd();
  const testCases = readTestCasesFromDir(sourceDir);
  checkForConsistency(testCases);
  const context = await getGitContext();
  const isDefaultBranch = context?.defaultBranch === context?.ref;

  const body: TestTargetSyncData = {
    testCases,
  };

  if (isDefaultBranch) {
    await defaultPush(body, options);
  } else {
    await draftPush(body, options);
  }
};

const defaultPush = async (
  body: TestTargetSyncData,
  options: { testTargetId: string; json?: boolean },
): Promise<void> => {
  const { data, error } = await client.POST(
    "/apiKey/beta/test-targets/{testTargetId}/push",
    {
      params: {
        path: {
          testTargetId: options.testTargetId,
        },
      },
      body,
    },
  );

  handleError(error);

  if (options.json) {
    logJson(data);
  } else {
    console.log("Test Target pushed successfully");
  }
};

const draftPush = async (
  body: TestTargetSyncData,
  options: { testTargetId: string; json?: boolean },
): Promise<void> => {
  const { data, error } = await client.POST(
    "/apiKey/beta/test-targets/{testTargetId}/draft/push",
    {
      params: {
        path: {
          testTargetId: options.testTargetId,
        },
      },
      body,
    },
  );

  handleError(error);

  if (options.json) {
    logJson(data);
  } else {
    console.log("Test Target draft pushed successfully");
  }
};
