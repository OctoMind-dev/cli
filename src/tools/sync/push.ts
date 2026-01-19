import { Client } from "openapi-fetch";

import { components, paths } from "../../api";
import { ListOptions } from "../client";
import { checkForConsistency } from "./consistency";
import { getGitContext } from "./git";
import { SyncDataByStableId, TestTargetSyncData } from "./types";
import { readTestCasesFromDir } from "./yaml";

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
  branchName?: string;
  client: Client<paths>;
  onError: (error: ErrorResponse) => void;
  force?: boolean;
};

export const push = async (
  options: PushOptions,
): Promise<
  | { success: boolean; versionIds: string[]; pushResult: "drafts" | "enabled" }
  | undefined
> => {
  const testCases = readTestCasesFromDir(options.sourceDir);
  checkForConsistency(testCases);
  const context = await getGitContext();
  const refName = options.branchName ?? context?.ref;
  const isDefaultBranch = !!context && context.defaultBranch === refName;

  const body: TestTargetSyncData = {
    testCases,
  };

  if (isDefaultBranch || options.force) {
    const pushResult = await defaultPush(body, options);
    if (!pushResult) {
      return undefined;
    }
    return { ...pushResult, pushResult: "enabled" };
  } else {
    const pushResult = await draftPush(body, options);
    if (!pushResult) {
      return undefined;
    }
    return { ...pushResult, pushResult: "drafts" };
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

export const draftPush = async (
  body: TestTargetSyncData,
  options: Omit<PushOptions, "sourceDir"> & ListOptions,
): Promise<
  | {
      success: boolean;
      versionIds: string[];
      syncDataByStableId: SyncDataByStableId;
    }
  | undefined
> => {
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
