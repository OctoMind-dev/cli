import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import { client, handleError } from "../../src/tools/client";
import { getTestPlan } from "../../src/tools/test-plans";

vi.mock("../../src/tools/client");

describe("test-plans", () => {
  beforeEach(() => {
    console.log = vi.fn();
  });

  describe("getTestPlan", () => {
    it("should retrieve a test plan by id", async () => {
      const testPlanId = "test-plan-123";
      const mockTestPlan = {
        id: testPlanId,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        status: "DONE",
        testTargetId: "test-target-123",
        environmentId: "env-123",
        baseUrl: "https://example.com",
        prompt: "Test plan prompt",
        traceUrl: "https://trace.example.com",
        videoUrl: null,
        context: {},
      };

      vi.mocked(client.GET).mockResolvedValue({
        data: mockTestPlan,
        error: undefined,
        response: mock(),
      });

      const result = await getTestPlan({
        id: testPlanId,
        testTargetId: "test-target-123",
      });

      expect(client.GET).toHaveBeenCalledWith(
        "/apiKey/beta/test-targets/{testTargetId}/test-plans/{id}",
        {
          params: {
            path: {
              id: testPlanId,
              testTargetId: "test-target-123",
            },
          },
        },
      );
      expect(handleError).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockTestPlan);
    });

    it("should handle error when test plan is not found", async () => {
      const testPlanId = "non-existent-id";

      vi.mocked(client.GET).mockResolvedValue({
        data: undefined,
        error: { message: "Not found" },
        response: mock(),
      });

      await expect(
        getTestPlan({ id: testPlanId, testTargetId: "test-target-123" }),
      ).rejects.toThrow(`No test plan with id ${testPlanId} found`);
      expect(handleError).toHaveBeenCalledWith({ message: "Not found" });
    });
  });
});
