import { logger } from "../logger";
import { BASE_URL, client, handleError } from "./client";

export const getPlaywrightConfig = async (options: {
  testTargetId: string;
  environmentId?: string;
  url: string;
  outputDir: string;
  headless?: boolean;
  bypassProxy?: boolean;
  browser?: "CHROMIUM" | "FIREFOX" | "SAFARI";
  breakpoint?: "DESKTOP" | "MOBILE" | "TABLET";
  bearerToken?: string;
}): Promise<string> => {
  if (options.bearerToken) {
    logger.debug("Using bearer token for config");
    const params = {
      environmentId: options.environmentId,
      url: options.url,
      outputDir: options.outputDir,
      headless: options.headless?.toString(),
      bypassProxy: options.bypassProxy?.toString(),
      browser: options.browser,
      breakpoint: options.breakpoint,
    };

    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined),
    ) as Record<string, string>;

    const searchParams = new URLSearchParams(filteredParams);

    const response = await fetch(
      `${BASE_URL}/bearer/v1/test-targets/${options.testTargetId}/config?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${options.bearerToken}`,
        },
      },
    );
    if (response.ok) {
      return await response.text();
    }
    throw new Error(`no config found. error: ${response.statusText}`);
  }
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
          bypassProxy: options.bypassProxy ? "true" : "false",
          browser: options.browser,
          breakpoint: options.breakpoint,
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

type PlaywrightCodeResponse = {
  testCode: string;
};

export const getPlaywrightCode = async (options: {
  testTargetId: string;
  testCaseId: string;
  environmentId?: string;
  executionUrl: string;
  bearerToken?: string;
}): Promise<string> => {
  if (options.bearerToken) {
    logger.debug("Using bearer token for test code");
    const params = {
      source: "debugtopus",
      executionUrl: options.executionUrl,
      environmentId: options.environmentId,
    };

    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined),
    ) as Record<string, string>;

    const searchParams = new URLSearchParams(filteredParams);

    const response = await fetch(
      `${BASE_URL}/bearer/v1/test-targets/${options.testTargetId}/test-cases/${options.testCaseId}/code?${searchParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${options.bearerToken}`,
        },
      },
    );
    if (response.ok) {
      const res = (await response.json()) as PlaywrightCodeResponse;
      return res.testCode;
    }
    throw new Error(`no test code found. error: ${response.statusText}`);
  }
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
