import { existsSync, mkdirSync, readdirSync, rmdirSync } from "node:fs";
import path from "node:path";

import { promptUser } from "./helpers";

export const OCTOMIND_DIR = ".octomind";

export const getPathToOctomindDir = async ({
  allowCreation,
  startDir = process.cwd(),
}: {
  allowCreation?: boolean;
  startDir?: string;
} = {}): Promise<string | null> => {
  let currentDir = startDir;
  while (currentDir !== "/") {
    if (checkForOctomindDir(currentDir)) {
      return path.resolve(path.join(currentDir, OCTOMIND_DIR));
    }
    currentDir = path.dirname(currentDir);
  }
  if (allowCreation) {
    return createOctomindDirInteractive({ dir: startDir });
  }
  return null;
};

const checkForOctomindDir = (dir: string): boolean => {
  const octomindDir = path.join(dir, OCTOMIND_DIR);
  try {
    return existsSync(octomindDir);
  } catch (error) {
    console.debug(`Error checking for octomind dir in ${dir}:`, error);
    // likely a permission issue, so we return false
    return false;
  }
};

export const createOctomindDirInteractive = async (
  options: { dir?: string; recreateOctomindDir?: boolean } = {},
): Promise<string> => {
  const dir = path.resolve(
    path.join(options.dir ?? process.cwd(), OCTOMIND_DIR),
  );
  const existingOctomindDir = await getPathToOctomindDir({
    allowCreation: false,
    startDir: options.dir,
  });

  if (existingOctomindDir && existingOctomindDir !== dir && !options.recreateOctomindDir) {
    console.log(`Octomind directory already exists: ${existingOctomindDir}.`);
    console.log(`Using existing octomind directory.`);
    return existingOctomindDir;
  }

  if (existingOctomindDir !== null) {
    console.log(`Octomind directory already exists: ${dir}.`);
    const removeExisting =
      options.recreateOctomindDir ||
      (
        await promptUser(`Remove and recreate empty directory? (y/N): `)
      ).toLowerCase() === "y";
    if (removeExisting) {
      console.log(`Removing and recreating empty directory...`);
      rmdirSync(existingOctomindDir);
      mkdirSync(dir, { recursive: true });
    } else {
      console.log(`Using existing octomind directory.`);
    }
  } else {
    mkdirSync(dir, { recursive: true });
    console.log(`✨ Created octomind directory: ${dir}`);
  }
  return dir;
};

export const showOctomindDir = async (): Promise<void> => {
  const octomindDir = await getPathToOctomindDir({ allowCreation: false });
  if (!octomindDir) {
    console.log(
      "You are not in an octomind directory or one of its children. Please run `octomind init` to create one.",
    );
    return;
  }
  console.log(`Octomind directory: ${octomindDir}`);
};
