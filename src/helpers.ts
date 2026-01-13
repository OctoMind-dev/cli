import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline";
import fsPromises from "fs/promises";

import { loadConfig } from "./config";
import { OCTOMIND_FOLDER_NAME } from "./constants";

export function promptUser(question: string): Promise<string> {
  const rl = createInterface({ input, output });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export const resolveTestTargetId = async (
  providedTestTargetId?: string,
): Promise<string> => {
  if (providedTestTargetId) {
    return providedTestTargetId;
  }

  const config = await loadConfig();
  if (!config.testTargetId) {
    throw new Error(
      "testTargetId is required. Please provide it as a parameter or configure it first by running 'octomind init'",
    );
  }
  return config.testTargetId;
};

const isDirectory = async (dirPath: string): Promise<boolean> => {
  try {
    const stat = await fsPromises.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
};

export const findOctomindFolder = async (): Promise<string | null> => {
  let currentDir = process.cwd();

  while (currentDir !== path.parse(currentDir).root) {
    const octomindPath = path.join(currentDir, OCTOMIND_FOLDER_NAME);
    if (await isDirectory(octomindPath)) {
      return octomindPath;
    }
    currentDir = path.dirname(currentDir);
  }

  const rootOctomind = path.join(currentDir, OCTOMIND_FOLDER_NAME);
  if (await isDirectory(rootOctomind)) {
    return rootOctomind;
  }

  return null;
};

export const getAbsoluteFilePathInOctomindRoot = async ({
  filePath,
  octomindRoot,
}: {
  filePath: string;
  octomindRoot: string;
}): Promise<string | null> => {
  const isWithinOctomindRoot = (p: string) => p.startsWith(octomindRoot);

  const isFile = async (p: string): Promise<boolean> => {
    try {
      const stats = await fsPromises.stat(p);
      return stats.isFile();
    } catch {
      return false;
    }
  };

  if (path.isAbsolute(filePath)) {
    return isWithinOctomindRoot(filePath) ? filePath : null;
  }

  // For relative paths, try resolving from cwd first, then from octomindRoot
  const candidates = [
    path.resolve(filePath),
    path.resolve(octomindRoot, filePath),
  ];

  for (const candidate of candidates) {
    if (isWithinOctomindRoot(candidate) && (await isFile(candidate))) {
      return candidate;
    }
  }

  return null;
};
