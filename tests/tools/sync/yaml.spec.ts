import fs from "fs";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import yaml from "yaml";

import {
  buildFilename,
  buildFolderName,
  cleanupFilesystem,
  readTestCasesFromDir,
  removeEmptyDirectoriesRecursively,
} from "../../../src/tools/sync/yaml";
import { createMockSyncTestCase } from "../../mocks";

describe("yaml", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "octomind-cli-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe("buildFilename", () => {
    it("creates a camelCase filename from description with .yaml extension", () => {
      const tc = createMockSyncTestCase({
        description: "My test case: Login flow",
      });
      const name = buildFilename(tc, tmpDir);
      expect(name).toBe("myTestCaseLoginFlow.yaml");
    });

    it("removes diacritics", () => {
      const tc = createMockSyncTestCase({
        description: "Mein Testfall: Übermäßig viele Umlaute",
      });
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
      expect(() => buildFilename(tc, tmpDir)).toThrow(
        "Test case with title '/:.' has no valid characters for the file system, please rename it",
      );
    });

    it("appends -1 when a file with the same name exists for a different id", () => {
      const tc1 = createMockSyncTestCase({
        id: "AAA",
        description: "Duplicate name",
      });
      const baseline = buildFilename(tc1, tmpDir);
      // simulate an existing file with different id content
      fs.writeFileSync(
        path.join(tmpDir, baseline),
        yaml.stringify({ id: "DIFFERENT" }),
      );

      const tc2 = createMockSyncTestCase({
        id: "BBB",
        description: "Duplicate name",
      });
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
      const b = createMockSyncTestCase({
        id: "B",
        dependencyId: "A",
        description: "User logs in",
      });
      const c = createMockSyncTestCase({
        id: "C",
        dependencyId: "B",
        description: "User navigates to dashboard",
      });

      const folderForC = buildFolderName(c, [a, b, c]);
      expect(folderForC).toBe("setUpData/userLogsIn");
    });

    it("prefixes the path with destination when provided", () => {
      const a = createMockSyncTestCase({ id: "A", description: "Set up data" });
      const b = createMockSyncTestCase({
        id: "B",
        dependencyId: "A",
        description: "User logs in",
      });
      const c = createMockSyncTestCase({
        id: "C",
        dependencyId: "B",
        description: "User navigates to dashboard",
      });

      const folderForC = buildFolderName(c, [a, b, c], "my/dest");
      expect(folderForC).toBe("my/dest/setUpData/userLogsIn");
    });

    it("throws when a dependency id is missing in the list", () => {
      const a = createMockSyncTestCase({ id: "A", description: "First" });
      const b = createMockSyncTestCase({
        id: "B",
        dependencyId: "Z",
        description: "Second",
      });
      expect(() => buildFolderName(b, [a, b])).toThrow(/not found/i);
    });

    it("detects cycles in prerequisites", () => {
      const a = createMockSyncTestCase({
        id: "A",
        dependencyId: "B",
        description: "First",
      });
      const b = createMockSyncTestCase({
        id: "B",
        dependencyId: "A",
        description: "Second",
      });
      expect(() => buildFolderName(a, [a, b])).toThrow(/cycle/i);
    });
  });

  describe("readTestCasesFromDir", () => {
    it("should parse an empty dir", () => {
      expect(readTestCasesFromDir(tmpDir)).toEqual([]);
    });

    it("should ignore non yaml files", () => {
      fs.writeFileSync(path.join(tmpDir, "test.txt"), "some content");

      expect(readTestCasesFromDir(tmpDir)).toEqual([]);
    });

    it("should ignore hidden directories", () => {
      fs.mkdirSync(path.join(tmpDir, ".test"));

      fs.writeFileSync(
        path.join(tmpDir, ".test", "test.yaml"),
        yaml.stringify(createMockSyncTestCase()),
      );
      expect(readTestCasesFromDir(tmpDir)).toEqual([]);
    });

    it("should ignore node_modules", () => {
      fs.mkdirSync(path.join(tmpDir, "node_modules"));

      fs.writeFileSync(
        path.join(tmpDir, "node_modules", "test.yaml"),
        yaml.stringify(createMockSyncTestCase()),
      );
      expect(readTestCasesFromDir(tmpDir)).toEqual([]);
    });

    it("should recursively find test cases in folders", () => {
      fs.mkdirSync(path.join(tmpDir, "test1"));

      const testCase = createMockSyncTestCase();
      const filePath = path.join(tmpDir, "test1", "test.yaml");
      fs.writeFileSync(filePath, yaml.stringify(testCase));
      expect(readTestCasesFromDir(tmpDir)).toEqual([
        { ...testCase, filePath },
      ]);
    });

    it("should skip invalid test cases and log an error", () => {
      fs.mkdirSync(path.join(tmpDir, "test1"));

      const testCase = createMockSyncTestCase({
        id: "invalidIdFormat",
      });
      fs.writeFileSync(
        path.join(tmpDir, "test1", "test.yaml"),
        yaml.stringify(testCase),
      );

      const result = readTestCasesFromDir(tmpDir);
      expect(result).toEqual([]);
    });
  });

  describe("cleanupFilesystem", () => {
    it("should remove the old file if the test case description has changed", () => {
      const id = crypto.randomUUID();
      const testCase = createMockSyncTestCase({
        id,
        description: "Old test description",
      });
      const folderName = tmpDir;
      const oldFilename = buildFilename(testCase, folderName);
      const oldFilePath = path.join(folderName, oldFilename);

      fs.writeFileSync(oldFilePath, yaml.stringify(testCase));
      expect(fs.existsSync(oldFilePath)).toBe(true);

      const updatedTestCase = {
        ...testCase,
        description: "New test description",
      };

      cleanupFilesystem({
        remoteTestCases: [updatedTestCase],
        destination: tmpDir,
      });

      expect(fs.existsSync(oldFilePath)).toBe(false);
    });

    it("should remove the old folder if the test case description has changed", () => {
      const id = crypto.randomUUID();
      const testCase = createMockSyncTestCase({
        id,
        description: "Old test description",
      });
      const folderName = tmpDir;
      const oldFilename = buildFilename(testCase, folderName);
      const oldFilePath = path.join(folderName, oldFilename);

      fs.writeFileSync(oldFilePath, yaml.stringify(testCase));

      const oldTestNameCamelCase = path
        .basename(oldFilePath)
        .replace(/\.yaml$/, "");
      const oldFolderPath = path.join(folderName, oldTestNameCamelCase);
      fs.mkdirSync(oldFolderPath, { recursive: true });
      fs.writeFileSync(
        path.join(oldFolderPath, "some-file.yaml"),
        yaml.stringify(createMockSyncTestCase()),
      );

      expect(fs.existsSync(oldFolderPath)).toBe(true);

      const updatedTestCase = {
        ...testCase,
        description: "New test description",
      };

      cleanupFilesystem({
        remoteTestCases: [updatedTestCase],
        destination: tmpDir,
      });

      expect(fs.existsSync(oldFolderPath)).toBe(false);
    });

    it("should remove local test case files that no longer exist remotely", () => {
      const localTestCase = createMockSyncTestCase({
        id: crypto.randomUUID(),
        description: "Local test case",
      });
      const remoteTestCase = createMockSyncTestCase({
        id: crypto.randomUUID(),
        description: "Remote test case",
      });

      const localFilePath = path.join(
        tmpDir,
        buildFilename(localTestCase, tmpDir),
      );
      fs.writeFileSync(localFilePath, yaml.stringify(localTestCase));

      expect(fs.existsSync(localFilePath)).toBe(true);

      cleanupFilesystem({
        remoteTestCases: [remoteTestCase],
        destination: tmpDir,
      });

      expect(fs.existsSync(localFilePath)).toBe(false);
    });

    it("should remove empty directories after removing local test cases", () => {
      const parentTestCase = createMockSyncTestCase({
        id: crypto.randomUUID(),
        description: "Parent test case",
      });
      const childTestCase = createMockSyncTestCase({
        id: crypto.randomUUID(),
        description: "Child test case",
        dependencyId: parentTestCase.id,
      });

      const parentDir = path.join(tmpDir, "parentTestCase");
      fs.mkdirSync(parentDir, { recursive: true });

      const childFilePath = path.join(
        parentDir,
        buildFilename(childTestCase, tmpDir),
      );
      fs.writeFileSync(
        path.join(tmpDir, buildFilename(parentTestCase, tmpDir)),
        yaml.stringify(parentTestCase),
      );
      fs.writeFileSync(childFilePath, yaml.stringify(childTestCase));

      expect(fs.existsSync(parentDir)).toBe(true);
      expect(fs.existsSync(childFilePath)).toBe(true);

      cleanupFilesystem({
        remoteTestCases: [parentTestCase],
        destination: tmpDir,
      });

      expect(fs.existsSync(childFilePath)).toBe(false);
      expect(fs.existsSync(parentDir)).toBe(false);
    });

    it("should not remove directories that still contain files", () => {
      const parentTestCase = createMockSyncTestCase({
        id: crypto.randomUUID(),
        description: "Parent test case",
      });
      const childTestCase1 = createMockSyncTestCase({
        id: crypto.randomUUID(),
        description: "Child test case 1",
        dependencyId: parentTestCase.id,
      });
      const childTestCase2 = createMockSyncTestCase({
        id: crypto.randomUUID(),
        description: "Child test case 2",
        dependencyId: parentTestCase.id,
      });

      const parentDir = path.join(tmpDir, "parentTestCase");
      fs.mkdirSync(parentDir, { recursive: true });

      const childFilePath1 = path.join(
        parentDir,
        buildFilename(childTestCase1, tmpDir),
      );
      const childFilePath2 = path.join(
        parentDir,
        buildFilename(childTestCase2, tmpDir),
      );
      fs.writeFileSync(
        path.join(tmpDir, buildFilename(parentTestCase, tmpDir)),
        yaml.stringify(parentTestCase),
      );
      fs.writeFileSync(childFilePath1, yaml.stringify(childTestCase1));
      fs.writeFileSync(childFilePath2, yaml.stringify(childTestCase2));

      expect(fs.existsSync(parentDir)).toBe(true);

      cleanupFilesystem({
        remoteTestCases: [parentTestCase, childTestCase2],
        destination: tmpDir,
      });

      expect(fs.existsSync(childFilePath1)).toBe(false);
      expect(fs.existsSync(childFilePath2)).toBe(true);
      expect(fs.existsSync(parentDir)).toBe(true);
    });
  });

  describe("removeEmptyDirectoriesRecursively", () => {
    it("should remove a single empty directory", () => {
      const emptyDir = path.join(tmpDir, "emptyDir");
      fs.mkdirSync(emptyDir);

      expect(fs.existsSync(emptyDir)).toBe(true);

      removeEmptyDirectoriesRecursively(emptyDir, tmpDir);

      expect(fs.existsSync(emptyDir)).toBe(false);
    });

    it("should recursively remove nested empty directories", () => {
      const level1 = path.join(tmpDir, "level1");
      const level2 = path.join(level1, "level2");
      const level3 = path.join(level2, "level3");

      fs.mkdirSync(level3, { recursive: true });

      expect(fs.existsSync(level1)).toBe(true);
      expect(fs.existsSync(level2)).toBe(true);
      expect(fs.existsSync(level3)).toBe(true);

      removeEmptyDirectoriesRecursively(level3, tmpDir);

      expect(fs.existsSync(level3)).toBe(false);
      expect(fs.existsSync(level2)).toBe(false);
      expect(fs.existsSync(level1)).toBe(false);
    });

    it("should stop at root folder path", () => {
      const subDir = path.join(tmpDir, "subDir");
      fs.mkdirSync(subDir);

      removeEmptyDirectoriesRecursively(subDir, tmpDir);

      expect(fs.existsSync(subDir)).toBe(false);
      expect(fs.existsSync(tmpDir)).toBe(true);
    });

    it("should not remove directories that contain files", () => {
      const level1 = path.join(tmpDir, "level1");
      const level2 = path.join(level1, "level2");

      fs.mkdirSync(level2, { recursive: true });
      fs.writeFileSync(path.join(level1, "file.txt"), "content");

      removeEmptyDirectoriesRecursively(level2, tmpDir);

      expect(fs.existsSync(level2)).toBe(false);
      expect(fs.existsSync(level1)).toBe(true);
    });

    it("should handle non-existent directories gracefully", () => {
      const nonExistent = path.join(tmpDir, "nonExistent");

      expect(() =>
        removeEmptyDirectoriesRecursively(nonExistent, tmpDir),
      ).not.toThrow();
    });

    it("should not remove directories with subdirectories that contain files", () => {
      const level1 = path.join(tmpDir, "level1");
      const level2 = path.join(level1, "level2");
      const level3 = path.join(level2, "level3");

      fs.mkdirSync(level3, { recursive: true });
      fs.writeFileSync(path.join(level2, "file.txt"), "content");

      removeEmptyDirectoriesRecursively(level3, tmpDir);

      expect(fs.existsSync(level3)).toBe(false);
      expect(fs.existsSync(level2)).toBe(true);
      expect(fs.existsSync(level1)).toBe(true);
    });
  });
});
