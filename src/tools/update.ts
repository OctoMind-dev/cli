import * as child_process from "node:child_process";
import fs from "fs";
import { homedir } from "os";
import path from "path";

import which from "which";

export const update = async (): Promise<void> => {
  const pathToRoot = path.posix.normalize(
    path.join(homedir(), "/.local/packages"),
  );
  const pathToPackageJson = path.join(pathToRoot, "package.json");

  if (!fs.existsSync(pathToPackageJson)) {
    console.error(
      "\x1b[31mcannot find package.json, cannot update, please update manually",
    );
    process.exit(1);
  }

  if (!(await which("npm"))) {
    console.error(
      `\x1b[31mcannot determine location of npm, cannot update, please update manually, package location: ${pathToPackageJson}`,
    );
    process.exit(1);
  }

  console.log(`updating package.json at ${pathToPackageJson}`);

  const result = child_process.execSync(
    "npm install @octomind/octomind@latest",
    {
      cwd: path.dirname(pathToRoot),
    },
  );

  console.log(`${result}`);
  console.log("\x1b[32m\n✔ update complete");
};
