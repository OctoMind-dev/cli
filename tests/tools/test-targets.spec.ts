import {getGitContext} from "../../src/tools/sync/git";
import {pushTestTarget} from "../../src/tools";
import {readTestCasesFromDir} from "../../src/tools/sync/yml";
import {client} from "../../src/tools/client";
import {mock} from "jest-mock-extended";
import { getPathToOctomindDirWithActiveTestTarget } from "../../src/dirManagement";

jest.mock("../../src/tools/sync/git");
jest.mock("../../src/tools/sync/yml");
jest.mock("../../src/tools/client");
jest.mock("../../src/dirManagement");

describe("push", () => {

    beforeEach(() => {
        jest.mocked(getGitContext).mockResolvedValue({
            defaultBranch: "refs/heads/main",
            ref: "refs/heads/main",
            repo: "my-repo",
            owner: "my-org",
            sha: "sha256-12123as"
        })

        jest.mocked(readTestCasesFromDir).mockReturnValue([])
        jest.mocked(client).POST.mockResolvedValue({ data: undefined, error: undefined, response: mock() })
        console.log = jest.fn();
        jest.mocked(getPathToOctomindDirWithActiveTestTarget).mockResolvedValue("test-data/.octomind/test-target-id");
    })

    it("pushes to main if on default branch", async () => {
        jest.mocked(getGitContext).mockResolvedValue({
            defaultBranch: "refs/heads/main",
            ref: "refs/heads/main",
            repo: "my-repo",
            owner: "my-org",
            sha: "sha256-12123as"
        })

        await pushTestTarget({
            testTargetId: "someId"
        })

        expect(client.POST).toHaveBeenCalledWith("/apiKey/beta/test-targets/{testTargetId}/push", expect.anything())
    })

    it("pushes to draft if on other branch", async () => {
        jest.mocked(getGitContext).mockResolvedValue({
            defaultBranch: "refs/heads/main",
            ref: "refs/heads/different",
            repo: "my-repo",
            owner: "my-org",
            sha: "sha256-12123as"
        })

        await pushTestTarget({
            testTargetId: "someId"
        })

        expect(client.POST).toHaveBeenCalledWith("/apiKey/beta/test-targets/{testTargetId}/draft/push", expect.anything())
    })
})
