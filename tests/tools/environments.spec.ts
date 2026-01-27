import { beforeEach, describe, expect, it, vi } from "vitest";

import { BASE_URL, client } from "../../src/tools/client";
import {
  type GetEnvironmentsOptions,
  getEnvironments,
} from "../../src/tools/environments";
import { createMockEnvironment } from "../mocks";

vi.mock("../../src/tools/client");

global.fetch = vi.fn();

describe("environments", () => {
  describe("getEnvironments", () => {
    const testTargetId = "test-target-id";
    const mockEnvironments = [
      createMockEnvironment({ id: "env-1", name: "Environment 1" }),
      createMockEnvironment({ id: "env-2", name: "Environment 2" }),
    ];

    it("should fetch environments using API key", async () => {
      vi.mocked(client.GET).mockResolvedValue({
        data: mockEnvironments,
        error: undefined,
        response: {} as Response,
      });

      const options: GetEnvironmentsOptions = { testTargetId };
      const result = await getEnvironments(options);

      expect(client.GET).toHaveBeenCalledWith(
        "/apiKey/v3/test-targets/{testTargetId}/environments",
        {
          params: {
            path: { testTargetId },
          },
        },
      );
      expect(result).toEqual(mockEnvironments);
    });

    it("should fetch environments using bearer token", async () => {
      const bearerToken = "test-bearer-token";
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockEnvironments,
      } as Response);

      const options: GetEnvironmentsOptions = { testTargetId, bearerToken };
      const result = await getEnvironments(options);

      expect(fetch).toHaveBeenCalledWith(
        `${BASE_URL}/api/bearer/v1/test-targets/${testTargetId}/environments`,
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
      );
      expect(result).toEqual(mockEnvironments);
      expect(client.GET).not.toHaveBeenCalled();
    });

    it("should throw error when no environments found with API key", async () => {
      vi.mocked(client.GET).mockResolvedValue({
        data: undefined,
        error: undefined,
        response: {} as Response,
      });

      const options: GetEnvironmentsOptions = { testTargetId };

      await expect(getEnvironments(options)).rejects.toThrow(
        "no environments found",
      );
    });

    it("should throw error when response is not ok with bearer token", async () => {
      const bearerToken = "test-bearer-token";
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        statusText: "Unauthorized",
      } as Response);

      const options: GetEnvironmentsOptions = { testTargetId, bearerToken };

      await expect(getEnvironments(options)).rejects.toThrow(
        "no environments found. error: Unauthorized",
      );
    });
  });
});
