import { OCTOMIND_FOLDER_NAME } from "../../constants";
import { findOctomindFolder } from "../../helpers";
import { client, handleError } from "../client";
import { draftPush } from "../sync/push";
import { SyncTestCase } from "../sync/types";

type CreateOptions = {
  testTargetId: string;
  name: string;
  from: string;
};

export const create = async (options: CreateOptions): Promise<void> => {
  const octomindRoot = await findOctomindFolder();
  if (!octomindRoot) {
    throw new Error(
      `Could not find ${OCTOMIND_FOLDER_NAME} folder, make sure to pull before trying to create a test case`,
    );
  }

  const newTestCase: SyncTestCase = {
    version: "1",
    id: crypto.randomUUID(),
    elements: [],
    runStatus: "OFF",
    description: options.name,
    prompt: "",
  };

  const response = await draftPush(
    {
      testCases: [newTestCase],
    },
    {
      testTargetId: options.testTargetId,
      client,
      onError: handleError,
    },
  );

  console.log(response);
};
