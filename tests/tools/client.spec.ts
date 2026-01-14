import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { createClientFromUrlAndApiKey } from "../../src/tools/client";
import { version } from "../../src/version";
import { createMockSyncTestCase } from "../mocks";

describe("client", () => {
  let mockedFetch: Mock<typeof fetch>;

  beforeEach(() => {
    mockedFetch = vi.fn();
    global.fetch = mockedFetch;

    mockedFetch.mockResolvedValue(
      new Response(JSON.stringify({ testCases: [createMockSyncTestCase()] }), {
        status: 200,
      }),
    );
  });

  describe(createClientFromUrlAndApiKey.name, () => {
    it("should allow using a pre-defined token", async () => {
      const baseUrl = "https://url.com";

      const apiKey = "my-token";
      const client = createClientFromUrlAndApiKey({ baseUrl, apiKey });

      await client.GET("/apiKey/beta/test-targets/{testTargetId}/pull", {
        params: {
          path: {
            testTargetId: "someId",
          },
        },
      });

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${baseUrl}/apiKey/beta/test-targets/someId/pull`,
          headers: new Headers({
            "x-api-key": apiKey,
            "user-agent": `octomind-cli/${version}`,
          }),
        }),
        undefined,
      );
    });
  });
});
