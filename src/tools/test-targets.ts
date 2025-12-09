import { getUrl } from "../url";
import { client, handleError, ListOptions, logJson } from "./client";
import { writeYaml } from "./sync/yml";
import { execSync } from "node:child_process";
import { components, paths } from "../api";
import yaml from "yaml";
import fs from "fs";
import path from "path";

export const getTestTargets = async () => {
  const { data, error } = await client.GET("/apiKey/v3/test-targets");

  handleError(error);

  if (!data) {
    throw Error("No test targets found");
  }

  return data;
};

export const listTestTargets = async (options: ListOptions): Promise<void> => {
  const testTargets = await getTestTargets();
  if (options.json) {
    logJson(testTargets);
    return;
  }

  console.log("Test Targets:");

  for (let idx = 0; idx < testTargets.length; idx++) {
    const testTarget = testTargets[idx];
    const idxString = `${idx + 1}. `.padEnd(
      testTargets.length.toString().length + 2,
    );
    const paddingString = " ".repeat(idxString.length);
    console.log(`${idxString}ID: ${testTarget.id}`);
    console.log(`${paddingString}App: ${testTarget.app}`);
    console.log(
      `${paddingString}${await getUrl({
        testTargetId: testTarget.id,
        entityType: "test-target",
      })}`,
    );
  }
};

export const pullTestTarget = async (
  options: { testTargetId: string; destination?: string } & ListOptions,
): Promise<void> => {
  const { data, error } = await client.GET(
    "/apiKey/beta/test-targets/{testTargetId}/pull",
    {
      params: {
        path: {
          testTargetId: options.testTargetId,
        },
      },
    },
  );

  handleError(error);

  if (!data) {
    throw Error("No test target found");
  }

  if (options.json) {
    logJson(data);
    return;
  }

  writeYaml(data, options.destination);

  console.log("Test Target pulled successfully");
};

type ExecutionContext = components["schemas"]["ExecutionContext"];

const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === "object" && val !== null;

const isTestCase = (val: unknown): val is PushTestTargetTestCase => {
  if (!isRecord(val)) return false;
  const idOk = typeof val.id === "string";
  const descOk =
    typeof val.description === "string" ||
    typeof val.description === "undefined";
  const elementsOk = Array.isArray((val as { elements?: unknown }).elements);
  return idOk && elementsOk && descOk;
};

const collectYamlFiles = (startDir: string): string[] => {
  const files: string[] = [];
  const stack: string[] = [startDir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        // skip hidden dirs like .git
        if (entry.name === ".git" || entry.name === "node_modules") continue;
        stack.push(full);
      } else if (entry.isFile() && full.toLowerCase().endsWith(".yaml")) {
        files.push(full);
      }
    }
  }
  return files;
};

export const readTestCasesFromDir = (
  startDir: string,
): PushTestTargetTestCase[] => {
  const yamlFiles = collectYamlFiles(startDir);
  const testCases: PushTestTargetTestCase[] = [];
  for (const file of yamlFiles) {
    try {
      const content = fs.readFileSync(file, "utf8");
      const parsed = yaml.parse(content);
      if (isTestCase(parsed)) {
        testCases.push(parsed);
      }
    } catch {
      console.error(`Failed to read test case from ${file}`);
    }
  }
  return testCases;
};

const parseGitRemote = (cwd: string): { owner?: string; repo?: string } => {
  try {
    const remote = execSync("git remote get-url origin", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    // Support formats:
    // 1) git@github.com:owner/repo.git
    // 2) https://github.com/owner/repo.git
    // 3) https://github.com/owner/repo
    let m = remote.match(/^git@[^:]+:([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!m) {
      m = remote.match(/^https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?$/);
    }
    if (m) {
      const owner = m[1];
      const repo = m[2];
      return { owner, repo };
    }
    // Fallback to repo name from top-level dir
    const top = execSync("git rev-parse --show-toplevel", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return { repo: path.basename(top) };
  } catch {
    return {};
  }
};

export type GitContext = ExecutionContext & { ref: string; defaultBranch?: string };

const getGitContext = (cwd: string): GitContext | undefined => {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    const sha = execSync("git rev-parse HEAD", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    const { owner, repo } = parseGitRemote(cwd);
    const ref = branch ? `refs/heads/${branch}` : undefined;

    const ctx: GitContext = {
      source: "github",
      sha,
      ref,
      repo,
      owner,
    };
    return ctx;
  } catch {
    return undefined;
  }
};

export type PushTestTargetBody =
  paths["/apiKey/beta/test-targets/{testTargetId}/push"]["post"]["requestBody"]["content"]["application/json"];

export type PushTestTargetTestCase = PushTestTargetBody["testCases"][number];

export const pushTestTarget = async (
  options: { testTargetId: string; source?: string } & ListOptions,
): Promise<void> => {
  const sourceDir = options.source
    ? path.resolve(options.source)
    : process.cwd();
  const testCases = readTestCasesFromDir(sourceDir);

  const context = getGitContext(sourceDir);

  const isDefaultBranch = context?.defaultBranch === context?.ref;

  const body: PushTestTargetBody = {
    //...(context ? { context } : {}),
    //testTargetId: options.testTargetId,
    testCases,
  };

  if( isDefaultBranch ) {
    await defaultPush(body, options);
  } else {
    await draftPush(body, options);
  }
};

const defaultPush = async (body: PushTestTargetBody, options: { testTargetId: string; json?: boolean }): Promise<void> => {
  const { data, error } = await client.POST(
    "/apiKey/beta/test-targets/{testTargetId}/push",
    {
      params: {
        path: {
          testTargetId: options.testTargetId,
        },
      },
      body,
    },
  );

  handleError(error);

  if (options.json) {
    logJson(data);
  } else {
    console.log("Test Target pushed successfully");
  }
};

const draftPush = async (body: PushTestTargetBody, options: { testTargetId: string; json?: boolean }): Promise<void> => {
  const { data, error } = await client.POST(
    // TODO add the draft path when available
    "/apiKey/beta/test-targets/{testTargetId}/push",
    {
      params: {
        path: {
          testTargetId: options.testTargetId,
        },
      },
      body,
    },
  );

  handleError(error);

  if (options.json) {
    logJson(data);
  } else {
    console.log("Test Target pushed successfully");
  }
};
