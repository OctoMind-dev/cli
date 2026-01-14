import ora from "ora";

import { sleep } from "../../helpers";
import { client } from "../client";
import { SyncTestCase } from "../sync/types";

const POLLING_INTERVAL = 1000;
const getTestCaseVersion = async (
  versionId: string,
  testCase: SyncTestCase,
  options: { testTargetId: string },
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

export const waitForLocalChangesToBeFinished = async (
  versionId: string,
  testCaseToEdit: SyncTestCase,
  options: { testTargetId: string },
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
