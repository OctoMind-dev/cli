import fs from "fs";
import path from "path";

import yaml from "yaml";

import { pushTestTargetBody } from "../../schemas/octomindExternalAPI";
import { SyncTestCase, TestTargetSyncData } from "./types";

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

export const writeYaml = (data: TestTargetSyncData, destination?: string) => {
  const folderToFileByTestCaseId = new Map<string, Map<string, string>>();

  for (const testCase of data.testCases) {
    const folderName = buildFolderName(testCase, data.testCases, destination);
    const testCaseFilename = buildFilename(testCase, folderName);
    cleanupFilesystem({ folderToFileByTestCaseId, folderName, testCase });
    fs.mkdirSync(folderName, { recursive: true });
    fs.writeFileSync(
      path.join(folderName, testCaseFilename),
      yaml.stringify(testCase),
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

export const readTestCasesFromDir = (startDir: string): SyncTestCase[] => {
  const yamlFiles = collectYamlFiles(startDir);
  const testCases: SyncTestCase[] = [];
  for (const file of yamlFiles) {
    try {
      const content = fs.readFileSync(file, "utf8");
      const parsed = yaml.parse(content);
      testCases.push(parsed);
    } catch {
      console.error(`Failed to read test case from ${file}`);
    }
  }

  const result = pushTestTargetBody.safeParse({ testCases });

  if (!result.success) {
    throw new Error(
      `Failed to parse test cases from ${startDir}: ${result.error.message}`,
    );
  }

  return testCases;
};

export const cleanupFilesystem = ({
  folderToFileByTestCaseId,
  folderName,
  testCase,
}: {
  folderToFileByTestCaseId: Map<string, Map<string, string>>;
  folderName: string;
  testCase: SyncTestCase;
}) => {
  if (!folderToFileByTestCaseId.has(folderName) && fs.existsSync(folderName)) {
    folderToFileByTestCaseId.set(folderName, new Map<string, string>());
    const yamlFiles = collectYamlFiles(folderName);
    for (const yamlFile of yamlFiles) {
      const content = fs.readFileSync(yamlFile, "utf-8");
      const parsed = yaml.parse(content);
      folderToFileByTestCaseId.get(folderName)?.set(parsed.id, yamlFile);
    }
  }

  const existingFileForTest = folderToFileByTestCaseId
    .get(folderName)
    ?.get(testCase.id);
  if (existingFileForTest) {
    const oldTestNameCamelCase = path
      .basename(existingFileForTest)
      .replace(/\.yaml$/, "");
    const currentTestNameCamelCase = toFileSystemCompatibleCamelCase(
      testCase.description,
    );

    if (oldTestNameCamelCase !== currentTestNameCamelCase) {
      fs.unlinkSync(existingFileForTest);
      const oldFolderName = `${path.dirname(existingFileForTest)}/${oldTestNameCamelCase}`;
      if (fs.existsSync(oldFolderName)) {
        fs.rmSync(oldFolderName, { recursive: true, force: true });
      }
    }
  }
};
