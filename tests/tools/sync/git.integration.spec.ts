import {parseGitRemote} from "../../../src/tools/sync/git";

describe('git', () => {
    it("should return the actual owner and repo", async () => {
        const remote = await parseGitRemote();

        expect(remote.owner).toEqual("OctoMind-dev");
        expect(remote.repo).toEqual("cli");
    })
})