import {createClientFromUrlAndApiKey} from "../../src/tools/client";
import {mock} from "jest-mock-extended";
import {createMockSyncTestCase} from "../mocks";
import { version } from "../../src/version";


describe("client", () => {
    let mockedFetch: jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
        mockedFetch = jest.fn();
        global.fetch = mockedFetch

        mockedFetch.mockResolvedValue(new Response(JSON.stringify({ testCases: [createMockSyncTestCase()]}), { status: 200}));
    });

    describe(createClientFromUrlAndApiKey.name, () => {
        it("should allow using a pre-defined token", async () => {
            let baseUrl = "https://url.com";

            let apiKey = "my-token";
            const client = createClientFromUrlAndApiKey({ baseUrl, apiKey})

            await client.GET("/apiKey/beta/test-targets/{testTargetId}/pull", {
                params: {
                    path: {
                        testTargetId: "someId"
                    }
                }
            })

            expect(mockedFetch).toHaveBeenCalledWith(expect.objectContaining({ url: `${baseUrl}/apiKey/beta/test-targets/someId/pull`, headers: new Headers({
                    "x-api-key": apiKey,
                    "user-agent": `octomind-cli/${version}`
                }) }), undefined)
        })
    })
})
