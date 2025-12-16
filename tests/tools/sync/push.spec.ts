import {getGitContext} from "../../../src/tools/sync/git";
import {readTestCasesFromDir} from "../../../src/tools/sync/yml";
import {client} from "../../../src/tools/client";
import {DeepMockProxy, mock, mockDeep} from "jest-mock-extended";
import {push} from "../../../src/tools/sync/push";

jest.mock("../../../src/tools/sync/git");
jest.mock("../../../src/tools/sync/yml");

describe("push", () => {
    let mockedClient: DeepMockProxy<typeof client>;

    beforeEach(() => {
        jest.mocked(getGitContext).mockResolvedValue({
            defaultBranch: "refs/heads/main",
            ref: "refs/heads/main",
            repo: "my-repo",
            owner: "my-org",
            sha: "sha256-12123as"
        })

        jest.mocked(readTestCasesFromDir).mockReturnValue([])
        console.log = jest.fn();
        mockedClient = mockDeep();
        mockedClient.POST.mockResolvedValue({ data: undefined, error: undefined, response: mock() })
    })

    it("pushes to main if on default branch", async () => {
        jest.mocked(getGitContext).mockResolvedValue({
            defaultBranch: "refs/heads/main",
            ref: "refs/heads/main",
            repo: "my-repo",
            owner: "my-org",
            sha: "sha256-12123as"
        })

        await push({
            testTargetId: "someId",
            sourceDir: ".",
            client: mockedClient,
            onError: jest.fn(),
        })

        expect(mockedClient.POST).toHaveBeenCalledWith("/apiKey/beta/test-targets/{testTargetId}/push", expect.anything())
    })

    it("pushes to draft if on other branch", async () => {
        jest.mocked(getGitContext).mockResolvedValue({
            defaultBranch: "refs/heads/main",
            ref: "refs/heads/different",
            repo: "my-repo",
            owner: "my-org",
            sha: "sha256-12123as"
        })

        await push({
            testTargetId: "someId",
            sourceDir: ".",
            client: mockedClient,
            onError: jest.fn(),
        })

        expect(mockedClient.POST).toHaveBeenCalledWith("/apiKey/beta/test-targets/{testTargetId}/draft/push", expect.anything())
    })

    it("calls the handleError callback on error", async () => {
        jest.mocked(getGitContext).mockResolvedValue({
            defaultBranch: "refs/heads/main",
            ref: "refs/heads/different",
            repo: "my-repo",
            owner: "my-org",
            sha: "sha256-12123as"
        })

        mockedClient.POST.mockResolvedValue({ data: undefined, error: [mock()], response: mock() })

        let handleError = jest.fn();
        await push({
            testTargetId: "someId",
            sourceDir: ".",
            client: mockedClient,
            onError: handleError,
        })

        expect(handleError).toHaveBeenCalled()
    })
})