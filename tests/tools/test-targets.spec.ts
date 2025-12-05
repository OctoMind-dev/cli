import fs from "fs";
import os from "os";
import path from "path";
import yaml from "yaml";

import { buildFolderName, buildFilename } from "../../src/tools/test-targets";

// Minimal shape needed by the helpers
interface Tc {
  id?: string | number;
  prerequisiteId?: string | number | null;
  description?: string;
}

describe("buildFilename", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "octomind-cli-test-"));
  });

  afterEach(() => {
    // Clean up temporary directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("creates a camelCase filename from description with .yaml extension", () => {
    const tc: Tc = { id: "ID-1", description: "My test case: Login flow" };
    const name = buildFilename(tc as any, tmpDir);
    expect(name).toBe("myTestCaseLoginFlow.yaml");
  });

  it("appends -1 when a file with the same name exists for a different id", () => {
    const tc1: Tc = { id: "AAA", description: "Duplicate name" };
    const baseline = buildFilename(tc1 as any, tmpDir);
    // simulate existing file with different id content
    fs.writeFileSync(path.join(tmpDir, baseline), yaml.stringify({ id: "DIFFERENT" }));

    const tc2: Tc = { id: "BBB", description: "Duplicate name" };
    const second = buildFilename(tc2 as any, tmpDir);
    expect(second).toBe(baseline.replace(/\.yaml$/, "-1.yaml"));
  });

  it("falls back to 'test.yaml' when description is missing or empty", () => {
    const tc: Tc = { id: "NO-DESC" };
    const name = buildFilename(tc as any, tmpDir);
    expect(name).toBe("test.yaml");
  });
});

describe("buildFolderName", () => {
  it("returns '.' when there are no prerequisites", () => {
    const tc: Tc = { id: 1, description: "Root" };
    const folder = buildFolderName(tc as any, [tc] as any);
    expect(folder).toBe(".");
  });

  it("builds a hierarchical path from prerequisite chain", () => {
    const a: Tc = { id: "A", description: "Set up data" };
    const b: Tc = { id: "B", prerequisiteId: "A", description: "User logs in" };
    const c: Tc = { id: "C", prerequisiteId: "B", description: "User navigates to dashboard" };

    const folderForC = buildFolderName(c as any, [a, b, c] as any);
    // "setUpData/userLogsIn"
    expect(folderForC).toBe("setUpData/userLogsIn");
  });

  it("prefixes the path with destination when provided", () => {
    const a: Tc = { id: "A", description: "Set up data" };
    const b: Tc = { id: "B", prerequisiteId: "A", description: "User logs in" };
    const c: Tc = { id: "C", prerequisiteId: "B", description: "User navigates to dashboard" };

    const folderForC = buildFolderName(c as any, [a, b, c] as any, "my/dest");
    expect(folderForC).toBe("my/dest/setUpData/userLogsIn");
  });

  it("throws when a prerequisite id is missing in the list", () => {
    const a: Tc = { id: "A", description: "First" };
    const b: Tc = { id: "B", prerequisiteId: "Z", description: "Second" };
    expect(() => buildFolderName(b as any, [a, b] as any)).toThrow(/not found/i);
  });

  it("detects cycles in prerequisites", () => {
    const a: Tc = { id: "A", prerequisiteId: "B", description: "First" };
    const b: Tc = { id: "B", prerequisiteId: "A", description: "Second" };
    expect(() => buildFolderName(a as any, [a, b] as any)).toThrow(/cycle/i);
  });
});
