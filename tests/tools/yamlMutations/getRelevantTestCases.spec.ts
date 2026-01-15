import { describe, expect, it } from "vitest";

import { getRelevantTestCases } from "../../../src/tools/yamlMutations/getRelevantTestCases";
import { createMockSyncTestCase } from "../../mocks";

describe("getRelevantTestCases", () => {
  describe("dependency chain", () => {
    it("returns only the start test case when it has no links", () => {
      const testCase = createMockSyncTestCase({ id: "test-id" });
      const testCasesById = { "test-id": testCase };

      const result = getRelevantTestCases(testCasesById, testCase);

      expect(result).toEqual([testCase]);
    });

    it("includes the dependency chain", () => {
      const parent = createMockSyncTestCase({ id: "parent-id" });
      const child = createMockSyncTestCase({
        id: "child-id",
        dependencyId: "parent-id",
      });
      const testCasesById = { "parent-id": parent, "child-id": child };

      const result = getRelevantTestCases(testCasesById, child);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(child);
      expect(result).toContainEqual(parent);
    });

    it("includes deeply nested dependency chain", () => {
      const grandparent = createMockSyncTestCase({ id: "grandparent-id" });
      const parent = createMockSyncTestCase({
        id: "parent-id",
        dependencyId: "grandparent-id",
      });
      const child = createMockSyncTestCase({
        id: "child-id",
        dependencyId: "parent-id",
      });
      const testCasesById = {
        "grandparent-id": grandparent,
        "parent-id": parent,
        "child-id": child,
      };

      const result = getRelevantTestCases(testCasesById, child);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual(child);
      expect(result).toContainEqual(parent);
      expect(result).toContainEqual(grandparent);
    });

    it("throws if dependency is not found", () => {
      const child = createMockSyncTestCase({
        id: "child-id",
        dependencyId: "missing-parent",
      });
      const testCasesById = { "child-id": child };

      expect(() => getRelevantTestCases(testCasesById, child)).toThrow(
        "Could not find dependency missing-parent for child-id",
      );
    });
  });

  describe("teardown chain", () => {
    it("includes the teardown test case", () => {
      const testCase = createMockSyncTestCase({
        id: "test-id",
        teardownId: "teardown-id",
      });
      const teardown = createMockSyncTestCase({ id: "teardown-id" });
      const testCasesById = { "test-id": testCase, "teardown-id": teardown };

      const result = getRelevantTestCases(testCasesById, testCase);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(testCase);
      expect(result).toContainEqual(teardown);
    });

    it("includes teardown's dependencies", () => {
      const testCase = createMockSyncTestCase({
        id: "test-id",
        teardownId: "teardown-id",
      });
      const teardownDependency = createMockSyncTestCase({
        id: "teardown-dependency-id",
      });
      const teardown = createMockSyncTestCase({
        id: "teardown-id",
        dependencyId: "teardown-dependency-id",
      });
      const testCasesById = {
        "test-id": testCase,
        "teardown-id": teardown,
        "teardown-dependency-id": teardownDependency,
      };

      const result = getRelevantTestCases(testCasesById, testCase);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual(testCase);
      expect(result).toContainEqual(teardown);
      expect(result).toContainEqual(teardownDependency);
    });

    it("throws if teardown is not found", () => {
      const testCase = createMockSyncTestCase({
        id: "test-id",
        teardownId: "missing-teardown",
      });
      const testCasesById = { "test-id": testCase };

      expect(() => getRelevantTestCases(testCasesById, testCase)).toThrow(
        "Could not find teardown missing-teardown for test-id",
      );
    });
  });

  describe("combined dependency and teardown", () => {
    it("includes both dependency and teardown chains", () => {
      const parent = createMockSyncTestCase({ id: "parent-id" });
      const teardown = createMockSyncTestCase({ id: "teardown-id" });
      const testCase = createMockSyncTestCase({
        id: "test-id",
        dependencyId: "parent-id",
        teardownId: "teardown-id",
      });
      const testCasesById = {
        "parent-id": parent,
        "test-id": testCase,
        "teardown-id": teardown,
      };

      const result = getRelevantTestCases(testCasesById, testCase);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual(testCase);
      expect(result).toContainEqual(parent);
      expect(result).toContainEqual(teardown);
    });

    it("handles shared test cases in dependency and teardown chains", () => {
      const shared = createMockSyncTestCase({ id: "shared-id" });
      const parent = createMockSyncTestCase({
        id: "parent-id",
        dependencyId: "shared-id",
      });
      const teardown = createMockSyncTestCase({
        id: "teardown-id",
        dependencyId: "shared-id",
      });
      const testCase = createMockSyncTestCase({
        id: "test-id",
        dependencyId: "parent-id",
        teardownId: "teardown-id",
      });
      const testCasesById = {
        "shared-id": shared,
        "parent-id": parent,
        "test-id": testCase,
        "teardown-id": teardown,
      };

      const result = getRelevantTestCases(testCasesById, testCase);

      expect(result).toHaveLength(4);
      expect(result).toContainEqual(testCase);
      expect(result).toContainEqual(parent);
      expect(result).toContainEqual(teardown);
      expect(result).toContainEqual(shared);
    });
  });
});
