import fs from "fs";
import path from "path";

import yaml from "yaml";

import { client, handleError } from "../client";
import { checkForConsistency } from "../sync/consistency";
import { draftPush } from "../sync/push";
import { SyncTestCase } from "../sync/types";
import { readTestCasesFromDir } from "../sync/yml";
import { findOctomindFolder, getAbsoluteFilePathInOctomindRoot } from "../../helpers";
import { OCTOMIND_FOLDER_NAME } from "../../constants";

type CreateOptions = {
    testTargetId: string;
    name: string
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
        prompt: ""
    }

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
