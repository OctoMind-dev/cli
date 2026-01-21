import * as child_process from "node:child_process";
import fs from "fs";
import { homedir } from "os";
import path from "path";

import which from "which";

import { logger } from "../logger";

export const update = async (): Promise<void> => {
  const pathToRoot = path.posix.normalize(
    path.join(homedir(), ".local", "packages"),
  );
  const pathToPackageJson = path.join(pathToRoot, "package.json");

  if (!fs.existsSync(pathToPackageJson)) {
    logger.error(
      "Cannot find package.json at ~/.local/packages. If you installed globally via npm, run: npm update -g @octomind/octomind",
    );
    process.exit(1);
  }

  if (!(await which("npm"))) {
    logger.error(
      `cannot determine location of npm, cannot update, please update manually, package location: ${pathToPackageJson}`,
    );
    process.exit(1);
  }

  const oldVersion = child_process.execSync("npm list @octomind/octomind", {
    cwd: pathToRoot,
    stdio: ["ignore", "pipe", "ignore"],
  });

  logger.info(`version before update: ${oldVersion}`);

  child_process.execSync("npm install @octomind/octomind@latest", {
    cwd: pathToRoot,
    stdio: "ignore",
  });

  const newVersion = child_process.execSync("npm list @octomind/octomind", {
    cwd: pathToRoot,
    stdio: ["ignore", "pipe", "ignore"],
  });

  logger.info(`✔ update complete: ${newVersion}`);
};
