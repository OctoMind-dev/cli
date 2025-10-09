import { client, handleError } from "./client";

export const getPlaywrightConfig = async (options: {
  testTargetId: string;
  environmentId?: string;
  url: string;
  outputDir: string;
  headless?: boolean;
}): Promise<string> => {
  const { data, error } = await client.GET(
    "/apiKey/v3/test-targets/{testTargetId}/config",
    {
      params: {
        path: {
          testTargetId: options.testTargetId,
        },
        query: {
          environmentId: options.environmentId,
          url: options.url,
          outputDir: options.outputDir,
          headless: options.headless ? "true" : "false",
        },
      },
      parseAs: "text",
    },
  );

  handleError(error);

  if (!data) {
    throw new Error("no config found");
  }

  return data;
};

export const getPlaywrightCode = async (options: {
  testTargetId: string;
  testCaseId: string;
  environmentId?: string;
  executionUrl: string;
}): Promise<string> => {
  const { data, error } = await client.GET(
    "/apiKey/v3/test-targets/{testTargetId}/test-cases/{testCaseId}/code",
    {
      params: {
        path: {
          testTargetId: options.testTargetId,
          testCaseId: options.testCaseId,
        },
        query: {
          environmentId: options.environmentId,
          executionUrl: options.executionUrl,
        },
      },
    },
  );

  handleError(error);

  if (!data) {
    throw new Error("no test code found");
  }

  return data.testCode;
};
