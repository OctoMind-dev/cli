import fsPromises from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OCTOMIND_FOLDER_NAME } from "../src/constants";
import {
  findOctomindFolder,
  getAbsoluteFilePathInOctomindRoot,
} from "../src/helpers";

describe("helpers", () => {
  describe("findOctomindFolder", () => {
    let tmpDir: string;
    const originalCwd = process.cwd;

    beforeEach(async () => {
      tmpDir = await fsPromises.mkdtemp(
        path.join(os.tmpdir(), "octomind-test-"),
      );
    });

    afterEach(async () => {
      process.cwd = originalCwd;
      await fsPromises.rm(tmpDir, { recursive: true });
    });

    it("should find .octomind folder in current directory", async () => {
      const octomindPath = path.join(tmpDir, OCTOMIND_FOLDER_NAME);
      await fsPromises.mkdir(octomindPath);
      process.cwd = () => tmpDir;

      const result = await findOctomindFolder();

      expect(result).toBe(octomindPath);
    });

    it("should find .octomind folder in parent directory", async () => {
      const octomindPath = path.join(tmpDir, OCTOMIND_FOLDER_NAME);
      const subdir = path.join(tmpDir, "subdir");
      await fsPromises.mkdir(octomindPath);
      await fsPromises.mkdir(subdir);
      process.cwd = () => subdir;

      const result = await findOctomindFolder();

      expect(result).toBe(octomindPath);
    });

    it("should traverse multiple levels to find .octomind folder", async () => {
      const octomindPath = path.join(tmpDir, OCTOMIND_FOLDER_NAME);
      const deepDir = path.join(tmpDir, "a", "b", "c");
      await fsPromises.mkdir(octomindPath);
      await fsPromises.mkdir(deepDir, { recursive: true });
      process.cwd = () => deepDir;

      const result = await findOctomindFolder();

      expect(result).toBe(octomindPath);
    });

    it("should return null when .octomind folder does not exist", async () => {
      process.cwd = () => tmpDir;

      const result = await findOctomindFolder();

      expect(result).toBeNull();
    });

    it("should return null when .octomind is a file instead of directory", async () => {
      const octomindPath = path.join(tmpDir, OCTOMIND_FOLDER_NAME);
      await fsPromises.writeFile(octomindPath, "");
      process.cwd = () => tmpDir;

      const result = await findOctomindFolder();

      expect(result).toBeNull();
    });

    it("should find .octomind folder when inside a subfolder of it", async () => {
      const octomindPath = path.join(tmpDir, OCTOMIND_FOLDER_NAME);
      const subfolderInOctomind = path.join(octomindPath, "subfolder");
      await fsPromises.mkdir(subfolderInOctomind, { recursive: true });
      process.cwd = () => subfolderInOctomind;

      const result = await findOctomindFolder();

      expect(result).toBe(octomindPath);
    });
  });

  describe("getAbsoluteFilePathInOctomindRoot", () => {
    let tmpDir: string;
    let octomindRoot: string;

    beforeEach(async () => {
      tmpDir = await fsPromises.mkdtemp(
        path.join(os.tmpdir(), "octomind-test-"),
      );
      octomindRoot = path.join(tmpDir, OCTOMIND_FOLDER_NAME);

      await fsPromises.mkdir(octomindRoot);
      octomindRoot = await fsPromises.realpath(octomindRoot);
    });

    afterEach(async () => {
      await fsPromises.rm(tmpDir, { recursive: true });
    });

    it("should resolve relative path within octomind root", async () => {
      const filePath = path.join(octomindRoot, "test-case.yaml");
      await fsPromises.writeFile(filePath, "");

      const result = await getAbsoluteFilePathInOctomindRoot({
        filePath: "test-case.yaml",
        octomindRoot,
      });

      expect(result).toBe(filePath);
    });

    it("should resolve nested relative path within octomind root", async () => {
      const subdir = path.join(octomindRoot, "subdir");
      await fsPromises.mkdir(subdir);
      const filePath = path.join(subdir, "test-case.yaml");
      await fsPromises.writeFile(filePath, "");

      const result = await getAbsoluteFilePathInOctomindRoot({
        filePath: "subdir/test-case.yaml",
        octomindRoot,
      });

      expect(result).toBe(filePath);
    });

    it("should return null for non-existent relative path", async () => {
      const result = await getAbsoluteFilePathInOctomindRoot({
        filePath: "does-not-exist.yaml",
        octomindRoot,
      });

      expect(result).toBeNull();
    });

    it("should accept absolute path within octomind root", async () => {
      const filePath = path.join(octomindRoot, "test-case.yaml");

      const result = await getAbsoluteFilePathInOctomindRoot({
        filePath,
        octomindRoot,
      });

      expect(result).toBe(filePath);
    });

    it("should return null for absolute path outside octomind root", async () => {
      const outsideFile = path.join(tmpDir, "outside.yaml");

      const result = await getAbsoluteFilePathInOctomindRoot({
        filePath: outsideFile,
        octomindRoot,
      });

      expect(result).toBeNull();
    });

    it("should return null for path traversal attempts", async () => {
      const result = await getAbsoluteFilePathInOctomindRoot({
        filePath: "../outside.yaml",
        octomindRoot,
      });

      expect(result).toBeNull();
    });
  });
});
