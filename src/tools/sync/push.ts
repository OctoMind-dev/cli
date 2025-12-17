import { Client } from "openapi-fetch";

import { components, paths } from "../../api";
import { ListOptions } from "../client";
import { checkForConsistency } from "./consistency";
import { getGitContext } from "./git";
import { TestTargetSyncData } from "./types";
import { readTestCasesFromDir } from "./yml";

type ErrorResponse =
  | components["schemas"]["ZodResponse"]
  | string
  | {
      status: "error";
      error: string;
    }
  | undefined;

type PushOptions = {
  testTargetId: string;
  sourceDir: string;
  client: Client<paths>;
  onError: (error: ErrorResponse) => void;
};

export const push = async (
  options: PushOptions,
): Promise<{ success: boolean; versionIds: string[] } | undefined> => {
  const testCases = readTestCasesFromDir(options.sourceDir);
  checkForConsistency(testCases);
  const context = await getGitContext();
  const isDefaultBranch = context?.defaultBranch === context?.ref;

  const body: TestTargetSyncData = {
    testCases,
  };

  if (isDefaultBranch) {
    return defaultPush(body, options);
  } else {
    return draftPush(body, options);
  }
};

const defaultPush = async (
  body: TestTargetSyncData,
  options: PushOptions,
): Promise<{ success: boolean; versionIds: string[] } | undefined> => {
  const { data, error } = await options.client.POST(
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

  options.onError(error);

  return data;
};

const draftPush = async (
  body: TestTargetSyncData,
  options: PushOptions & ListOptions,
): Promise<{ success: boolean; versionIds: string[] } | undefined> => {
  const { data, error } = await options.client.POST(
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

  options.onError(error);

  return data;
};
