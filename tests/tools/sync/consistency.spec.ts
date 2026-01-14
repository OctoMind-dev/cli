import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkForConsistency } from "../../../src/tools/sync/consistency";
import { createMockSyncTestCase } from "../../mocks";

describe("checkForConsistency", () => {
  it("passes when all test cases have unique ids", () => {
    const testCases = [
      createMockSyncTestCase({ id: "tc-1" }),
      createMockSyncTestCase({ id: "tc-2" }),
      createMockSyncTestCase({ id: "tc-3" }),
    ];
    expect(() => checkForConsistency(testCases)).not.toThrow();
  });

  it("throws when duplicate test case ids exist", () => {
    const testCases = [
      createMockSyncTestCase({ id: "tc-1" }),
      createMockSyncTestCase({ id: "tc-2" }),
      createMockSyncTestCase({ id: "tc-1" }), // duplicate
    ];
    expect(() => checkForConsistency(testCases)).toThrow(/duplicate id tc-1/);
  });

  it("passes when dependencyId references an existing test case", () => {
    const testCases = [
      createMockSyncTestCase({ id: "tc-1" }),
      createMockSyncTestCase({ id: "tc-2", dependencyId: "tc-1" }),
    ];
    expect(() => checkForConsistency(testCases)).not.toThrow();
  });

  it("throws when dependencyId references a non-existing test case", () => {
    const testCases = [
      createMockSyncTestCase(),
      createMockSyncTestCase({ id: "tc-2", dependencyId: "tc-999" }),
    ];
    expect(() => checkForConsistency(testCases)).toThrow(
      /dependency not found tc-999/,
    );
  });

  it("passes when teardownId references an existing test case", () => {
    const testCases = [
      createMockSyncTestCase({ id: "tc-1" }),
      createMockSyncTestCase({ id: "tc-2", teardownId: "tc-1" }),
    ];
    expect(() => checkForConsistency(testCases)).not.toThrow();
  });

  it("throws when teardownId references a non-existing test case", () => {
    const testCases = [
      createMockSyncTestCase({ id: "tc-1" }),
      createMockSyncTestCase({ id: "tc-2", teardownId: "tc-999" }),
    ];
    expect(() => checkForConsistency(testCases)).toThrow(
      /tear down not found tc-999/,
    );
  });

  it("passes with complex dependency chains", () => {
    const testCases = [
      createMockSyncTestCase({ id: "login" }),
      createMockSyncTestCase({ id: "teardown" }),
      createMockSyncTestCase({
        id: "test-1",
        dependencyId: "login",
        teardownId: "teardown",
      }),
      createMockSyncTestCase({
        id: "test-2",
        dependencyId: "login",
        teardownId: "teardown",
      }),
    ];
    expect(() => checkForConsistency(testCases)).not.toThrow();
  });

  it("passes with empty test cases array", () => {
    expect(() => checkForConsistency([])).not.toThrow();
  });

  it("passes when dependencyId and teardownId are undefined", () => {
    const testCases = [
      createMockSyncTestCase({
        id: "tc-1",
        dependencyId: undefined,
        teardownId: undefined,
      }),
    ];
    expect(() => checkForConsistency(testCases)).not.toThrow();
  });

  it("throws when there is a direct cyclic dependency (A -> A)", () => {
    const testCases = [
      createMockSyncTestCase({ id: "tc-1", dependencyId: "tc-1" }),
    ];
    expect(() => checkForConsistency(testCases)).toThrow(
      "loop detected, [tc-1] -> [tc-1]",
    );
  });

  it("throws when there is a two-node cycle (A -> B -> A)", () => {
    const testCases = [
      createMockSyncTestCase({ id: "tc-1", dependencyId: "tc-2" }),
      createMockSyncTestCase({ id: "tc-2", dependencyId: "tc-1" }),
    ];
    expect(() => checkForConsistency(testCases)).toThrow(
      "loop detected, [tc-1] -> [tc-2] -> [tc-1]",
    );
  });

  it("throws when there is a multi-node cycle (A -> B -> C -> A)", () => {
    const testCases = [
      createMockSyncTestCase({ id: "tc-1", dependencyId: "tc-2" }),
      createMockSyncTestCase({ id: "tc-2", dependencyId: "tc-3" }),
      createMockSyncTestCase({ id: "tc-3", dependencyId: "tc-1" }),
    ];
    expect(() => checkForConsistency(testCases)).toThrow(
      "loop detected, [tc-1] -> [tc-3] -> [tc-2] -> [tc-1]",
    );
  });

  it("passes with valid linear dependency chain (A -> B -> C)", () => {
    const testCases = [
      createMockSyncTestCase({ id: "tc-1" }),
      createMockSyncTestCase({ id: "tc-2", dependencyId: "tc-1" }),
      createMockSyncTestCase({ id: "tc-3", dependencyId: "tc-2" }),
    ];
    expect(() => checkForConsistency(testCases)).not.toThrow();
  });

  it("passes with multiple test cases depending on the same dependency", () => {
    const testCases = [
      createMockSyncTestCase({ id: "login" }),
      createMockSyncTestCase({ dependencyId: "login" }),
      createMockSyncTestCase({ dependencyId: "login" }),
      createMockSyncTestCase({ dependencyId: "login" }),
    ];
    expect(() => checkForConsistency(testCases)).not.toThrow();
  });
});
