import { client, handleError, outputResult } from "./client";

export const getPlaywrightConfig = async (options: {
  testTargetId: string;
  environmentId?: string;
  url: string;
  outputDir: string;
  headless?: boolean;
  json?: boolean;
}): Promise<string> => {
  const { data, error } = await client.GET(
    "/apiKey/v2/test-targets/{testTargetId}/config",
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

  if (options.json) {
    outputResult(data);
  }

  return data;
};

export const getPlaywrightCode = async (options: {
  testTargetId: string;
  testCaseId: string;
  environmentId?: string;
  executionUrl: string;
  json?: boolean;
}): Promise<string> => {
  const { data, error } = await client.GET(
    "/apiKey/v2/test-targets/{testTargetId}/test-cases/{testCaseId}/code",
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
    console.log({ data, error });
    throw new Error("no test code found");
  }

  if (options.json) {
    outputResult(data);
  }

  return data.testCode;
};
