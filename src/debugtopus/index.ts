import { existsSync, writeFileSync } from "fs";
import { promisify } from "util";
import { exec } from "child_process";
import { randomUUID } from "crypto";
import path, { dirname } from "path";
import fs from "fs/promises";
import { ensureChromiumIsInstalled } from "./installation";
import {
  getPlaywrightCode,
  getPlaywrightConfig,
  getTestCases,
  getTestTarget,
  TestCase,
} from "./octomind-api";

type DebugtopusOptions = {
  id?: string;
  testTargetId: string;
  token: string;
  url: string;
  octomindUrl: string;
  environmentId?: string;
  headless?: boolean;
};

type BasicAuth = { username: string; password: string };

type Environment = {
  id: string;
  basicAuth?: BasicAuth;
  type: "DEFAULT" | "ADDITIONAL";
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

type TestCaseWithCode = TestCase & { code: string };

const getUniqueFilename = (tempDir: string, testCase: TestCaseWithCode) => {
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

  const tempDir = path.join(packageRootDir, "temp");

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
  testCasesWithCode: TestCaseWithCode[];
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
    token: options.token,
    url: options.url,
    octomindUrl: options.octomindUrl,
    environmentId: options.environmentId,
  };

  const testTarget = await getTestTarget({
    testTargetId: options.testTargetId,
    token: options.token,
    octomindUrl: options.octomindUrl,
  });

  let testCasesWithCode: TestCaseWithCode[] = [];
  if (options.id) {
    testCasesWithCode = [
      {
        id: options.id,
        code: await getPlaywrightCode({
          testCaseId: options.id,
          ...baseApiOptions,
        }),
      },
    ];
  } else {
    const testCases = await getTestCases(baseApiOptions);

    testCasesWithCode = await Promise.all(
      testCases.map(async (testCase) => ({
        code: await getPlaywrightCode({
          testCaseId: testCase.id,
          ...baseApiOptions,
        }),
        ...testCase,
      })),
    );
  }

  const environmentIdForConfig = options.environmentId
    ? options.environmentId
    : testTarget.environments.find((env: Environment) => env.type === "DEFAULT")
        .id;

  const dirs = await prepareDirectories();

  const config = await getPlaywrightConfig({
    testTargetId: options.testTargetId,
    token: options.token,
    octomindUrl: options.octomindUrl,
    url: options.url,
    outputDir: dirs.outputDir,
    environmentId: environmentIdForConfig,
    headless: options.headless,
  });

  writeConfigAndTests({
    testCasesWithCode,
    config,
    dirs,
  });
  await runTests({ ...dirs, runMode: options.headless ? "headless" : "ui" });
};
