import fs from "fs";
import path from "path";
import os from "os";
import yaml from "yaml";
import {createMockSyncTestCase} from "../../mocks";
import {buildFilename, buildFolderName} from "../../../src/tools/sync/yml";

describe("buildFilename", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "octomind-cli-test-"));
    });

    afterEach(() => {
        // Clean up temporary directory
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            // ignore
        }
    });

    it("creates a camelCase filename from description with .yaml extension", () => {
        const tc = createMockSyncTestCase({ description: "My test case: Login flow" });
        const name = buildFilename(tc, tmpDir);
        expect(name).toBe("myTestCaseLoginFlow.yaml");
    });

    it("removes diacritics", () => {
        const tc = createMockSyncTestCase({ description: "Mein Testfall: Übermäßig viele Umlaute" });
        const name = buildFilename(tc, tmpDir);
        expect(name).toBe("meinTestfallUbermaßigVieleUmlaute.yaml");
    });

    it("keeps unicode characters", () => {
        const tc = createMockSyncTestCase({ description: "统一码" });
        const name = buildFilename(tc, tmpDir);
        expect(name).toBe("统一码.yaml");
    });

    it("removes invalid characters", () => {
        const tc = createMockSyncTestCase({ description: "some test\/:." });
        const name = buildFilename(tc, tmpDir);
        expect(name).toBe("someTest.yaml");
    });

    it("throws if there is ONLY invalid characters", () => {
        const tc = createMockSyncTestCase({ description: "\/:." });
        expect(() => buildFilename(tc, tmpDir)).toThrow("Test case with title '/:.' has no valid characters for the file system, please rename it");
    });

    it("appends -1 when a file with the same name exists for a different id", () => {
        const tc1 = createMockSyncTestCase({ id: "AAA", description: "Duplicate name" });
        const baseline = buildFilename(tc1, tmpDir);
        // simulate an existing file with different id content
        fs.writeFileSync(path.join(tmpDir, baseline), yaml.stringify({ id: "DIFFERENT" }));

        const tc2 = createMockSyncTestCase({ id: "BBB", description: "Duplicate name" });
        const second = buildFilename(tc2, tmpDir);
        expect(second).toBe(baseline.replace(/\.yaml$/, "-1.yaml"));
    });
});

describe("buildFolderName", () => {
    it("returns '.' when there are no prerequisites", () => {
        const tc = createMockSyncTestCase({ id: "1", description: "Root" });
        const folder = buildFolderName(tc, [tc]);
        expect(folder).toBe(".");
    });

    it("builds a hierarchical path from prerequisite chain", () => {
        const a = createMockSyncTestCase({ id: "A", description: "Set up data" });
        const b = createMockSyncTestCase({ id: "B", dependencyId: "A", description: "User logs in" });
        const c = createMockSyncTestCase({ id: "C", dependencyId: "B", description: "User navigates to dashboard" });

        const folderForC = buildFolderName(c, [a, b, c]);
        expect(folderForC).toBe("setUpData/userLogsIn");
    });

    it("prefixes the path with destination when provided", () => {
        const a = createMockSyncTestCase({ id: "A", description: "Set up data" });
        const b = createMockSyncTestCase({ id: "B", dependencyId: "A", description: "User logs in" });
        const c = createMockSyncTestCase({ id: "C", dependencyId: "B", description: "User navigates to dashboard" });

        const folderForC = buildFolderName(c, [a, b, c], "my/dest");
        expect(folderForC).toBe("my/dest/setUpData/userLogsIn");
    });

    it("throws when a dependency id is missing in the list", () => {
        const a = createMockSyncTestCase({ id: "A", description: "First" });
        const b = createMockSyncTestCase({ id: "B", dependencyId: "Z", description: "Second" });
        expect(() => buildFolderName(b, [a, b] )).toThrow(/not found/i);
    });

    it("detects cycles in prerequisites", () => {
        const a = createMockSyncTestCase({ id: "A", dependencyId: "B", description: "First" });
        const b = createMockSyncTestCase({ id: "B", dependencyId: "A", description: "Second" });
        expect(() => buildFolderName(a, [a, b])).toThrow(/cycle/i);
    });
});
