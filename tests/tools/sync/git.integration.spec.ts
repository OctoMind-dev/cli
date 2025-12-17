import {getDefaultBranch, parseGitRemote} from "../../../src/tools/sync/git";

describe('git', () => {
    it("should return the actual owner and repo", async () => {
        const remote = await parseGitRemote();

        expect(remote.owner).toEqual("OctoMind-dev");
        expect(remote.repo).toEqual("cli");
    })

    it.each(["symbolicRef+origin", "origin"] as const)("should return the actual default branch for method '%s'", async (allowedMethod) => {
        const defaultBranch = await getDefaultBranch(allowedMethod);

        expect(defaultBranch).toEqual("refs/heads/main");
    });


})