import path from "path";

import {
  getPathToOctomindDir,
  getPathToOctomindDirWithActiveTestTarget,
} from "../dirManagement";
import { getUrl } from "../url";
import { client, handleError, ListOptions, logJson } from "./client";
import { push } from "./sync/push";
import { writeYaml } from "./sync/yml";

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
  options: { testTargetId: string } & ListOptions,
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

  handleError(error);

  if (!data) {
    throw Error("No test target found");
  }

  if (options.json) {
    logJson(data);
    return;
  }

  const destination = await getPathToOctomindDirWithActiveTestTarget({
    allowCreation: true,
    providedTestTargetId: options.testTargetId,
  });
  if (!destination) {
    throw new Error("No octomind directory found");
  }
  writeYaml(data, destination);

  console.log("Test Target pulled successfully");
};

export const pushTestTarget = async (
  options: { testTargetId: string } & ListOptions,
): Promise<void> => {
  const source = await getPathToOctomindDirWithActiveTestTarget({
    allowCreation: false,
    providedTestTargetId: options.testTargetId,
  });
  if (!source) {
    throw new Error("No octomind directory found");
  }

  const data = await push({
    ...options,
    sourceDir: source,
    testTargetId: options.testTargetId,
    onError: handleError,
    client,
  });

  if (options.json) {
    logJson(data);
  }
};
