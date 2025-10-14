import { exec } from "child_process";
import { randomUUID } from "crypto";
import { existsSync, writeFileSync } from "fs";
import fs from "fs/promises";
import path, { dirname } from "path";
import { promisify } from "util";

import {
  getEnvironments,
  getPlaywrightCode,
  getPlaywrightConfig,
  getTestCases,
} from "../tools";
import { ensureChromiumIsInstalled } from "./installation";

type DebugtopusOptions = {
  testCaseId?: string;
  testTargetId: string;
  url: string;
  environmentId?: string;
  headless?: boolean;
  persist?: boolean;
  grep?: string;
};

const getPackageRootLevel = (appDir: string): string => {
  let infiniteLoopPrevention = 5;
  let rootDir = appDir;

  while (infiniteLoopPrevention > 0) {
    const nodeDir = path.join(rootDir, "node_modules");
    if (existsSync(nodeDir)) {
      break;
    }

    rootDir = path.join(rootDir, "..");
    infiniteLoopPrevention -= 1;
  }

  if (infiniteLoopPrevention === 0) {
    throw new Error("can't find root level node modules");
  }

  return rootDir;
};

type TestDirectories = {
  configFilePath: string;
  testDirectory: string;
  outputDir: string;
  packageRootDir: string;
};

type TestCaseCodeWithId = { id: string; description?: string; code: string };

const getUniqueFilename = (tempDir: string, testCase: TestCaseCodeWithId) => {
  const fileNameUUID = randomUUID();
  const name = testCase.description
    ? testCase.description.replaceAll(path.sep, "-")
    : testCase.id;
  return path.join(tempDir, `${name}-${fileNameUUID}.spec.ts`);
};

const prepareDirectories = async (
  packageRootDir?: string,
): Promise<TestDirectories> => {
  if (!packageRootDir) {
    // at runtime, we are installed in an arbitrary npx cache folder,
    // we need to find the rootDir ourselves and cannot rely on paths relative to src
    const nodeModule = require.main;
    if (!nodeModule) {
      throw new Error("package was not installed as valid nodeJS module");
    }
    const appDir = dirname(nodeModule.filename);
    packageRootDir = getPackageRootLevel(appDir);
  }

  const tempDir = path.join(packageRootDir, "octomind-cli-debug");

  if (existsSync(tempDir)) {
    await fs.rm(tempDir, { force: true, recursive: true });
  }

  await fs.mkdir(tempDir);

  const outputDir = path.join(tempDir, "output");

  const fileNameUUID = randomUUID();
  const configFilePath = path.join(tempDir, `${fileNameUUID}.config.ts`);
  return {
    outputDir,
    configFilePath,
    testDirectory: tempDir,
    packageRootDir,
  };
};

const writeConfigAndTests = ({
  testCasesWithCode,
  config,
  dirs,
}: {
  testCasesWithCode: TestCaseCodeWithId[];
  config: string;
  dirs: TestDirectories;
}): string[] => {
  const testFilePaths: string[] = [];
  for (const testCase of testCasesWithCode) {
    const testFilePath = getUniqueFilename(dirs.testDirectory, testCase);
    writeFileSync(testFilePath, testCase.code);
    testFilePaths.push(testFilePath);
  }

  writeFileSync(dirs.configFilePath, config);
  return testFilePaths;
};

const createPlaywrightCommand = ({
  configFilePath,
  testDirectory,
}: {
  configFilePath: string;
  testDirectory: string;
}): string =>
  `npx playwright test --config=${configFilePath.replaceAll(
    "\\",
    "/",
  )} ${testDirectory.replaceAll("\\", "/")}`;

const runTests = async ({
  configFilePath,
  testDirectory,
  outputDir,
  runMode,
  packageRootDir,
}: {
  configFilePath: string;
  testDirectory: string;
  outputDir: string;
  packageRootDir: string;
  runMode: "ui" | "headless";
}): Promise<void> => {
  await ensureChromiumIsInstalled(packageRootDir);

  let command = createPlaywrightCommand({ configFilePath, testDirectory });

  if (runMode === "ui") {
    command += " --ui";
  }

  console.log(`executing command : '${command}'`);

  const { stderr } = await promisify(exec)(command, {
    cwd: packageRootDir,
  });

  if (stderr) {
    console.error(stderr);
    process.exit(1);
  } else {
    console.log(`success, you can find your artifacts at ${outputDir}`);
  }
};

export const runDebugtopus = async (options: DebugtopusOptions) => {
  const baseApiOptions = {
    testTargetId: options.testTargetId,
    url: options.url,
    environmentId: options.environmentId,
  };

  let testCasesWithCode: TestCaseCodeWithId[] = [];
  if (options.testCaseId) {
    testCasesWithCode = [
      {
        id: options.testCaseId,
        code: await getPlaywrightCode({
          testCaseId: options.testCaseId,
          executionUrl: options.url,
          ...baseApiOptions,
        }),
      },
    ];
  } else {
    const testCases = await getTestCases({
      ...baseApiOptions,
      status: "ENABLED",
    });
    if (!testCases) {
      throw new Error("no test cases found");
    }

    testCasesWithCode = await Promise.all(
      testCases
        .filter((testCase) =>
          options.grep
            ? testCase.description
                ?.toLowerCase()
                .includes(options.grep.toLowerCase())
            : true,
        )
        .map(async (testCase) => ({
          code: await getPlaywrightCode({
            testCaseId: testCase.id,
            executionUrl: options.url,
            ...baseApiOptions,
          }),
          ...testCase,
        })),
    );
  }

  let environmentIdForConfig = options.environmentId;
  if (!environmentIdForConfig) {
    const environments = await getEnvironments(baseApiOptions);
    environmentIdForConfig = environments.find(
      (env) => env.type === "DEFAULT",
    )?.id;
  }

  if (!environmentIdForConfig) {
    throw new Error("no environment found");
  }

  const dirs = await prepareDirectories(
    options.persist ? process.cwd() : undefined,
  );

  const config = await getPlaywrightConfig({
    testTargetId: options.testTargetId,
    url: options.url,
    outputDir: dirs.outputDir,
    environmentId: environmentIdForConfig,
    headless: options.headless,
  });

  if (!config) {
    throw new Error("no config found");
  }

  writeConfigAndTests({
    testCasesWithCode,
    config,
    dirs,
  });
  await runTests({ ...dirs, runMode: options.headless ? "headless" : "ui" });
};
