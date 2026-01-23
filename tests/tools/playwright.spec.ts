import { beforeEach, describe, expect, it, vi } from "vitest";

import { BASE_URL, client } from "../../src/tools/client";
import {
  getPlaywrightCode,
  getPlaywrightConfig,
} from "../../src/tools/playwright";

vi.mock("../../src/tools/client");

global.fetch = vi.fn();

describe("playwright", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPlaywrightConfig", () => {
    const testTargetId = "test-target-id";
    const url = "https://example.com";
    const outputDir = "/output";
    const mockConfig = "export default { testDir: './tests' };";

    it("should fetch playwright config using API key", async () => {
      vi.mocked(client.GET).mockResolvedValue({
        data: mockConfig,
        error: undefined,
        response: {} as Response,
      });

      const result = await getPlaywrightConfig({
        testTargetId,
        url,
        outputDir,
      });

      expect(client.GET).toHaveBeenCalledWith(
        "/apiKey/v3/test-targets/{testTargetId}/config",
        {
          params: {
            path: { testTargetId },
            query: {
              environmentId: undefined,
              url,
              outputDir,
              headless: "false",
              bypassProxy: "false",
              browser: undefined,
              breakpoint: undefined,
            },
          },
          parseAs: "text",
        },
      );
      expect(result).toEqual(mockConfig);
    });

    it("should fetch playwright config using bearer token", async () => {
      const bearerToken = "test-bearer-token";
      const environmentId = "env-id";
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => mockConfig,
      } as Response);

      const result = await getPlaywrightConfig({
        testTargetId,
        url,
        outputDir,
        environmentId,
        headless: true,
        bypassProxy: true,
        browser: "CHROMIUM",
        breakpoint: "DESKTOP",
        bearerToken,
      });

      const expectedParams = new URLSearchParams({
        environmentId,
        url,
        outputDir,
        headless: "true",
        bypassProxy: "true",
        browser: "CHROMIUM",
        breakpoint: "DESKTOP",
      });

      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/bearer/v1/test-targets/${testTargetId}/config?${expectedParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
      );
      expect(result).toEqual(mockConfig);
      expect(client.GET).not.toHaveBeenCalled();
    });

    it("should throw error when no config found with API key", async () => {
      vi.mocked(client.GET).mockResolvedValue({
        data: undefined,
        error: undefined,
        response: {} as Response,
      });

      await expect(
        getPlaywrightConfig({ testTargetId, url, outputDir }),
      ).rejects.toThrow("no config found");
    });

    it("should throw error when response is not ok with bearer token", async () => {
      const bearerToken = "test-bearer-token";
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        statusText: "Unauthorized",
      } as Response);

      await expect(
        getPlaywrightConfig({ testTargetId, url, outputDir, bearerToken }),
      ).rejects.toThrow("no config found. error: Unauthorized");
    });
  });

  describe("getPlaywrightCode", () => {
    const testTargetId = "test-target-id";
    const testCaseId = "test-case-id";
    const executionUrl = "https://example.com";
    const mockTestCode = "test('example', async ({ page }) => {});";

    it("should fetch playwright code using API key", async () => {
      vi.mocked(client.GET).mockResolvedValue({
        data: { testCode: mockTestCode },
        error: undefined,
        response: {} as Response,
      });

      const result = await getPlaywrightCode({
        testTargetId,
        testCaseId,
        executionUrl,
      });

      expect(client.GET).toHaveBeenCalledWith(
        "/apiKey/v3/test-targets/{testTargetId}/test-cases/{testCaseId}/code",
        {
          params: {
            path: { testTargetId, testCaseId },
            query: {
              environmentId: undefined,
              executionUrl,
            },
          },
        },
      );
      expect(result).toEqual(mockTestCode);
    });

    it("should fetch playwright code using bearer token", async () => {
      const bearerToken = "test-bearer-token";
      const environmentId = "env-id";
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ testCode: mockTestCode }),
      } as Response);

      const result = await getPlaywrightCode({
        testTargetId,
        testCaseId,
        executionUrl,
        environmentId,
        bearerToken,
      });

      const expectedParams = new URLSearchParams({
        source: "debugtopus",
        executionUrl,
        environmentId,
      });

      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/bearer/v1/test-targets/${testTargetId}/test-cases/${testCaseId}/code?${expectedParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
      );
      expect(result).toEqual(mockTestCode);
      expect(client.GET).not.toHaveBeenCalled();
    });

    it("should throw error when no test code found with API key", async () => {
      vi.mocked(client.GET).mockResolvedValue({
        data: undefined,
        error: undefined,
        response: {} as Response,
      });

      await expect(
        getPlaywrightCode({ testTargetId, testCaseId, executionUrl }),
      ).rejects.toThrow("no test code found");
    });

    it("should throw error when response is not ok with bearer token", async () => {
      const bearerToken = "test-bearer-token";
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        statusText: "Forbidden",
      } as Response);

      await expect(
        getPlaywrightCode({
          testTargetId,
          testCaseId,
          executionUrl,
          bearerToken,
        }),
      ).rejects.toThrow("no test code found. error: Forbidden");
    });
  });
});
