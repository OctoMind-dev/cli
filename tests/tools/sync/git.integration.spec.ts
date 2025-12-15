import {getDefaultBranch} from "../../../src/tools/sync/git";

describe('git', () => {
    it("should return the actual main branch", async () => {
        const defaultBranch = await getDefaultBranch();

        expect(defaultBranch).toEqual("refs/heads/main");
    })
})