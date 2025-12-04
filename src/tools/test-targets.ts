import { client, handleError, ListOptions, logJson } from "./client";
import { components } from "../api";  
import yaml from "yaml";
import fs from "fs";
import path from "path";
import { getUrl } from "../url";

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

export type TestTargetPullData = components["schemas"]["TestTargetPullData"];

type TestCases = components["schemas"]["TestTargetPullData"]["testCases"];

const writeYaml = (data: TestTargetPullData, destination?: string) => {

  for(const testCase of data.testCases) {
    const folderName = buildFolderName(testCase, data.testCases, destination);
    const testCaseFilename = buildFilename(testCase, folderName);
    // Ensure folder exists
    fs.mkdirSync(folderName, { recursive: true });
    fs.writeFileSync(path.join(folderName, testCaseFilename), yaml.stringify(testCase));
  }

  //fs.writeFileSync("test-target.yaml", yaml.stringify(data));
};

export const buildFolderName = (testCase: TestCases[number], testCases: TestCases, destination?: string): string => {
  type T = { id?: string | number; prerequisiteId?: string | number; description?: string };

  const toSegment = (desc: string | undefined): string => {
    const raw = String(desc ?? "root");
    const normalized = raw
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "");
    const tokens = normalized
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean);
    const camel = tokens
      .map((t, i) => {
        const lower = t.toLowerCase();
        if (i === 0) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join("");
    return camel || "root";
  };

  const idOf = (tc: TestCases[number]) => String((tc as T).id ?? "");
  const prereqOf = (tc: TestCases[number]) =>
    (tc as T).prerequisiteId === undefined || (tc as T).prerequisiteId === null
      ? undefined
      : String((tc as T).prerequisiteId);

  const findById = (id: string): TestCases[number] | undefined =>
    testCases.find((tc) => idOf(tc) === id);

  const segments: string[] = [];
  const visited = new Set<string>();

  let currentPrereq = prereqOf(testCase);
  while (currentPrereq !== undefined) {
    if (visited.has(currentPrereq)) {
      throw new Error(`Cycle detected in prerequisites at id ${currentPrereq}`);
    }
    visited.add(currentPrereq);

    const prereqTc = findById(currentPrereq);
    if (!prereqTc) {
      throw new Error(`Prerequisite with id ${currentPrereq} not found in test cases`);
    }

    const seg = toSegment((prereqTc as T).description);
    segments.unshift(seg);

    currentPrereq = prereqOf(prereqTc);
  }

  // Build relative path from prerequisites
  const relative = segments.length === 0 ? "." : segments.join("/");

  if (destination && destination.trim().length > 0) {
    const dest = destination.replace(/\/$/, "");
    return segments.length === 0 ? dest : `${dest}/${relative}`;
  }

  return relative;
};

const hasSameNameButDifferentId = (name: string, folderName: string, id: string): boolean => {
  const exists = fs.existsSync(path.join(folderName, name))
  if( !exists ) {
    return false;
  }

  const content = fs.readFileSync(path.join(folderName, name), "utf-8");
  const parsed = yaml.parse(content);
  return parsed.id !== id;
};

export const buildFilename = (testCase: TestCases[number], folderName: string): string => {
  const raw = String((testCase as { description?: string })?.description ?? "test");

  // Normalize and strip diacritics
  const normalized = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  // Split into tokens on non-alphanumeric characters
  const tokens = normalized
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  // Build camelCase
  const baseCamel = tokens
    .map((t, i) => {
      const lower = t.toLowerCase();
      if (i === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");

  const safeBase = baseCamel || "test";

  // Ensure uniqueness within the folder by appending -x if necessary
  let candidate = `${safeBase}.yaml`;
  let suffix = 1;
  while (hasSameNameButDifferentId(candidate, folderName, testCase.id)) {
    candidate = `${safeBase}-${suffix}.yaml`;
    suffix += 1;
  }

  return candidate;
};

export const pullTestTarget = async (options: { testTargetId: string } & ListOptions): Promise<void> => {

  const { data, error } = await client.GET("/apiKey/v3/test-targets/{testTargetId}/pull", {
    params: {
      path: {
        testTargetId: options.testTargetId,
      },
    },
  });

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
