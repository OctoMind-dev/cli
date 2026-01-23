import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

import yaml from "yaml";

import { logger } from "../../logger";
import { PushTestTargetBody } from "../../schemas/octomindExternalAPI";
import { SyncTestCase, TestTargetSyncData } from "./types";

const syncTestCaseSchema = PushTestTargetBody.shape.testCases.element;

const removeDiacritics = (str: string): string => {
  // diacritics lead to issues in the file system afterward, cf. https://www.reddit.com/r/MacOS/comments/jhjv41/psa_beware_of_umlauts_and_other_accented/
  return str.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
};

const removeInvalidCharacters = (str: string): string => {
  // cf. https://superuser.com/questions/358855/what-characters-are-safe-in-cross-platform-file-names-for-linux-windows-and-os
  // .,",' is technically legal, but . might produce hidden files, and the rest makes it much less readable, so we just remove it
  return removeDiacritics(str).replace(/[\\/:*?"'<>|.]/g, "");
};

const toFileSystemCompatibleCamelCase = (description: string): string => {
  const tokens = removeInvalidCharacters(description)
    .split(/\s/)
    .filter(Boolean);
  const camelCased = tokens
    .map((t, i) => {
      const lower = t.toLowerCase();
      if (i === 0) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");

  if (camelCased.length === 0) {
    throw new Error(
      `Test case with title '${description}' has no valid characters for the file system, please rename it`,
    );
  }

  return camelCased;
};

export const writeSingleTestCaseYaml = async (
  filePath: string,
  testCase: SyncTestCase,
): Promise<void> => {
  return fsPromises.writeFile(
    filePath,
    `# yaml-language-server: $schema=https://app.octomind.dev/schemas/SyncTestCaseSchema.json\n${yaml.stringify(testCase)}`,
  );
};

export const writeYaml = async (
  data: TestTargetSyncData,
  destination?: string,
  partialSync = false,
): Promise<void> => {
  cleanupFilesystem({
    remoteTestCases: data.testCases,
    destination,
    partialSync,
  });

  for (const testCase of data.testCases) {
    const folderName = buildFolderName(testCase, data.testCases, destination);
    const testCaseFilename = buildFilename(testCase, folderName);
    fs.mkdirSync(folderName, { recursive: true });
    await writeSingleTestCaseYaml(
      path.join(folderName, testCaseFilename),
      testCase,
    );
  }
};

export const buildFolderName = (
  testCase: SyncTestCase,
  testCases: SyncTestCase[],
  destination?: string,
): string => {
  const testCasesById = new Map(testCases.map((tc) => [tc.id, tc]));

  const segments: string[] = [];
  const visited = new Set<string>();

  let currentDependencyId = testCase.dependencyId;
  while (currentDependencyId) {
    if (visited.has(currentDependencyId)) {
      throw new Error(
        `Cycle detected in prerequisites at id ${currentDependencyId}`,
      );
    }
    visited.add(currentDependencyId);

    const dependency = testCasesById.get(currentDependencyId);
    if (!dependency) {
      throw new Error(
        `Prerequisite with id ${currentDependencyId} not found in test cases`,
      );
    }

    const segment = toFileSystemCompatibleCamelCase(dependency.description);
    segments.unshift(segment);

    currentDependencyId = dependency.dependencyId;
  }

  const relative = segments.length === 0 ? "." : segments.join("/");

  if (destination && destination.trim().length > 0) {
    const dest = destination.replace(/\/$/, "");
    return segments.length === 0 ? dest : `${dest}/${relative}`;
  }

  return relative;
};

const hasSameNameButDifferentId = (
  name: string,
  folderName: string,
  id: string,
): boolean => {
  const exists = fs.existsSync(path.join(folderName, name));
  if (!exists) {
    return false;
  }

  const content = fs.readFileSync(path.join(folderName, name), "utf-8");
  const parsed = yaml.parse(content);
  return parsed.id !== id;
};

export const buildFilename = (
  testCase: SyncTestCase,
  folderName: string,
): string => {
  const camelCase = toFileSystemCompatibleCamelCase(testCase.description);

  // Ensure uniqueness within the folder by appending -x if necessary
  let candidate = `${camelCase}.yaml`;
  let suffix = 1;
  while (hasSameNameButDifferentId(candidate, folderName, testCase.id)) {
    candidate = `${camelCase}-${suffix}.yaml`;
    suffix += 1;
  }

  return candidate;
};

const collectYamlFiles = (startDir: string): string[] => {
  const files: string[] = [];
  const stack: string[] = [startDir];
  let current = stack.pop();
  while (current) {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      current = stack.pop();
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        // skip hidden dirs
        if (entry.name.startsWith(".") || entry.name === "node_modules") {
          continue;
        }
        stack.push(full);
      } else if (entry.isFile() && full.toLowerCase().endsWith(".yaml")) {
        files.push(full);
      }
    }

    current = stack.pop();
  }
  return files;
};

export const readTestCasesFromDir = (
  startDir: string,
): Array<SyncTestCase & { filePath?: string }> => {
  const yamlFiles = collectYamlFiles(startDir);
  const testCases: Array<SyncTestCase & { filePath: string }> = [];
  for (const file of yamlFiles) {
    try {
      const content = fs.readFileSync(file, "utf8");
      const raw = yaml.parse(content);
      const result = syncTestCaseSchema.safeParse(raw);

      if (result.success) {
        testCases.push({ ...result.data, filePath: file });
      } else {
        logger.warn(
          `Failed to read test case from ${file}: ${result.error.message}`,
        );
      }
    } catch {
      logger.error(`Failed to read test case from ${file}`);
    }
  }

  return testCases;
};

export const loadTestCase = (testCasePath: string): SyncTestCase => {
  try {
    const content = fs.readFileSync(testCasePath, "utf8");
    return yaml.parse(content);
  } catch (error) {
    throw new Error(`Could not parse ${testCasePath}: ${error}`);
  }
};

export const removeEmptyDirectoriesRecursively = (
  dirPath: string,
  rootFolderPath: string,
): void => {
  if (dirPath === rootFolderPath || !fs.existsSync(dirPath)) {
    return;
  }

  const remainingFiles = fs.readdirSync(dirPath);
  if (remainingFiles.length === 0) {
    fs.rmdirSync(dirPath);
    removeEmptyDirectoriesRecursively(path.dirname(dirPath), rootFolderPath);
  }
};

export const cleanupFilesystem = ({
  remoteTestCases,
  destination,
  partialSync,
}: {
  remoteTestCases: SyncTestCase[];
  destination: string | undefined;
  partialSync: boolean;
}) => {
  const rootFolderPath = destination ?? process.cwd();

  const localTestCases = readTestCasesFromDir(rootFolderPath);

  const localTestCasesById = new Map(localTestCases.map((tc) => [tc.id, tc]));

  const remoteTestCasesById = new Map(remoteTestCases.map((tc) => [tc.id, tc]));

  // There is generally a bigger issue here:
  // We need a better check what changed locally.
  // Imagine you rename a test case remotely, and then you locally change steps in child test case.
  // Then you pull, and you local changes will just be deleted.
  // Same applies for changing the dependency, as it will be in a different folder. We also don't clean up these folders properly.

  for (const remoteTestCase of remoteTestCases) {
    const localTestCase = localTestCasesById.get(remoteTestCase.id);
    if (localTestCase) {
      const localTestCasePath = buildFilename(localTestCase, rootFolderPath);
      const oldFolderPath = path.join(
        rootFolderPath,
        localTestCasePath.replace(/\.yaml$/, ""),
      );
      const oldFilePath = path.join(rootFolderPath, localTestCasePath);

      if (localTestCase.description !== remoteTestCase.description) {
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }

        if (fs.existsSync(oldFolderPath)) {
          fs.rmSync(oldFolderPath, { recursive: true, force: true });
        }
      }
    }
  }
  if (!partialSync) {
    for (const localTestCase of localTestCases) {
      // If the local test case is not in the remote test cases, remove it
      if (
        !remoteTestCasesById.has(localTestCase.id) &&
        localTestCase.filePath
      ) {
        fs.rmSync(localTestCase.filePath, { force: true });

        const dirPath = path.dirname(localTestCase.filePath);
        removeEmptyDirectoriesRecursively(dirPath, rootFolderPath);
      }
    }
  }
};
