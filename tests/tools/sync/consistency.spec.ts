import {SyncTestCase} from "../../../src/tools/sync/types";
import {checkForConsistency} from "../../../src/tools/sync/consistency";

describe("checkForConsistency", () => {
    const createTestCase = (id: string, overrides?: Partial<SyncTestCase>): SyncTestCase => ({
        id,
        version: "1",
        tagNames: [],
        runStatus: "ON",
        prompt: "",
        elements: [],
        description: `Test case ${id}`,
        ...overrides,
    });

    it("passes when all test cases have unique ids", () => {
        const testCases = [
            createTestCase("tc-1"),
            createTestCase("tc-2"),
            createTestCase("tc-3"),
        ];
        expect(() => checkForConsistency(testCases)).not.toThrow();
    });

    it("throws when duplicate test case ids exist", () => {
        const testCases = [
            createTestCase("tc-1"),
            createTestCase("tc-2"),
            createTestCase("tc-1"), // duplicate
        ];
        expect(() => checkForConsistency(testCases)).toThrow(/duplicate id tc-1/);
    });

    it("passes when dependencyId references an existing test case", () => {
        const testCases = [
            createTestCase("tc-1"),
            createTestCase("tc-2", { dependencyId: "tc-1" }),
        ];
        expect(() => checkForConsistency(testCases)).not.toThrow();
    });

    it("throws when dependencyId references a non-existing test case", () => {
        const testCases = [
            createTestCase("tc-1"),
            createTestCase("tc-2", { dependencyId: "tc-999" }),
        ];
        expect(() => checkForConsistency(testCases)).toThrow(/dependency not found tc-999/);
    });

    it("passes when teardownId references an existing test case", () => {
        const testCases = [
            createTestCase("tc-1"),
            createTestCase("tc-2", { teardownId: "tc-1" }),
        ];
        expect(() => checkForConsistency(testCases)).not.toThrow();
    });

    it("throws when teardownId references a non-existing test case", () => {
        const testCases = [
            createTestCase("tc-1"),
            createTestCase("tc-2", { teardownId: "tc-999" }),
        ];
        expect(() => checkForConsistency(testCases)).toThrow(/tear down not found tc-999/);
    });

    it("passes with complex dependency chains", () => {
        const testCases = [
            createTestCase("login"),
            createTestCase("teardown"),
            createTestCase("test-1", { dependencyId: "login", teardownId: "teardown" }),
            createTestCase("test-2", { dependencyId: "login", teardownId: "teardown" }),
        ];
        expect(() => checkForConsistency(testCases)).not.toThrow();
    });

    it("passes with empty test cases array", () => {
        expect(() => checkForConsistency([])).not.toThrow();
    });

    it("passes when dependencyId and teardownId are undefined", () => {
        const testCases = [
            createTestCase("tc-1", { dependencyId: undefined, teardownId: undefined }),
        ];
        expect(() => checkForConsistency(testCases)).not.toThrow();
    });

    it("throws when there is a direct cyclic dependency (A -> A)", () => {
        const testCases = [
            createTestCase("tc-1", { dependencyId: "tc-1" }),
        ];
        expect(() => checkForConsistency(testCases)).toThrow("loop detected, [tc-1] -> [tc-1]");
    });

    it("throws when there is a two-node cycle (A -> B -> A)", () => {
        const testCases = [
            createTestCase("tc-1", { dependencyId: "tc-2" }),
            createTestCase("tc-2", { dependencyId: "tc-1" }),
        ];
        expect(() => checkForConsistency(testCases)).toThrow("loop detected, [tc-1] -> [tc-2] -> [tc-1]");
    });

    it("throws when there is a multi-node cycle (A -> B -> C -> A)", () => {
        const testCases = [
            createTestCase("tc-1", { dependencyId: "tc-2" }),
            createTestCase("tc-2", { dependencyId: "tc-3" }),
            createTestCase("tc-3", { dependencyId: "tc-1" }),
        ];
        expect(() => checkForConsistency(testCases)).toThrow("loop detected, [tc-1] -> [tc-3] -> [tc-2] -> [tc-1]");
    });

    it("passes with valid linear dependency chain (A -> B -> C)", () => {
        const testCases = [
            createTestCase("tc-1"),
            createTestCase("tc-2", { dependencyId: "tc-1" }),
            createTestCase("tc-3", { dependencyId: "tc-2" }),
        ];
        expect(() => checkForConsistency(testCases)).not.toThrow();
    });

    it("passes with multiple test cases depending on the same dependency", () => {
        const testCases = [
            createTestCase("login"),
            createTestCase("test-1", { dependencyId: "login" }),
            createTestCase("test-2", { dependencyId: "login" }),
            createTestCase("test-3", { dependencyId: "login" }),
        ];
        expect(() => checkForConsistency(testCases)).not.toThrow();
    });
});
