import { pipeline } from "node:stream/promises";
import { exec } from "child_process";
import { randomUUID } from "crypto";
import { createWriteStream, existsSync, writeFileSync } from "fs";
import fs from "fs/promises";
import path, { dirname } from "path";
import { Readable } from "stream";
import { ReadableStream } from "stream/web";
import { promisify } from "util";

import { Open } from "unzipper";

import { getPathToOctomindDir } from "../dirManagement";
import {
  getEnvironments,
  getPlaywrightCode,
  getPlaywrightConfig,
  getTestCases,
} from "../tools";
import { client, handleError } from "../tools/client";
import { readTestCasesFromDir } from "../tools/sync/yml";
import { ensureChromiumIsInstalled } from "./installation";

export type DebugtopusOptions = {
  testCaseId?: string;
  testTargetId: string;
  url: string;
  environmentId?: string;
  headless?: boolean;
  persist?: boolean;
  grep?: string;
  bypassProxy?: boolean;
  browser?: "CHROMIUM" | "FIREFOX" | "SAFARI";
  breakpoint?: "DESKTOP" | "MOBILE" | "TABLET";
  runStatus?: "ON" | "OFF";
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
      runStatus: options.runStatus,
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
    bypassProxy: options.bypassProxy,
    browser: options.browser,
    breakpoint: options.breakpoint,
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

export const executeLocalTestCases = async (
  options: DebugtopusOptions,
): Promise<void> => {
  const source = await getPathToOctomindDir();
  if (!source) {
    throw new Error("No octomind directory found");
  }
  const testCases = readTestCasesFromDir(source);
  const body = {
    testCases,
    testTargetId: options.testTargetId,
    executionUrl: options.url,
    environmentId: options.environmentId,
  };
  const { error, response } = await client.POST(
    "/apiKey/beta/test-targets/{testTargetId}/code",
    {
      params: {
        path: {
          testTargetId: options.testTargetId,
        },
      },
      body,
      parseAs: "stream",
    },
  );

  if (error || !response?.body) {
    handleError(error);
  }

  const dirs = await prepareDirectories();

  await readZipFromResponseBody(dirs, response);

  const config = await getPlaywrightConfig({
    testTargetId: options.testTargetId,
    url: options.url,
    outputDir: dirs.outputDir,
    environmentId: options.environmentId,
    headless: options.headless,
    bypassProxy: options.bypassProxy,
    browser: options.browser,
    breakpoint: options.breakpoint,
  });

  if (!config) {
    handleError("no config found");
  }

  writeFileSync(dirs.configFilePath, config);

  await runTests({ ...dirs, runMode: options.headless ? "headless" : "ui" });
};

export const readZipFromResponseBody = async (
  dirs: TestDirectories,
  response: Response,
): Promise<void> => {
  // Persist the ZIP to disk first to avoid streaming issues with unzipper
  const zipPath = path.join(dirs.testDirectory, "bundle.zip");
  const zipWriteStream = createWriteStream(zipPath);
  await pipeline(
    Readable.fromWeb(response.body as ReadableStream),
    zipWriteStream,
  );

  // Extract using unzipper's higher-level API
  try {
    const zipBuffer = await fs.readFile(zipPath);
    const directory = await Open.buffer(zipBuffer);
    await directory.extract({ path: dirs.testDirectory });
  } catch {
    throw new Error(`Failed to extract ZIP at ${zipPath}`);
  }
};
