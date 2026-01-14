import * as child_process from "node:child_process";
import fs from "fs";
import { homedir } from "os";
import path from "path";

import { beforeEach, describe, expect, it, vi } from "vitest";
import which from "which";

import { update } from "../../src/tools/update";

vi.mock("node:child_process");
vi.mock("fs");
vi.mock("which");

describe("update", () => {
  const mockPathToRoot = path.posix.normalize(
    path.join(homedir(), "/.local/packages"),
  );

  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(which).mockResolvedValue("/usr/bin/npm");
    vi.mocked(child_process.execSync).mockReturnValue(
      Buffer.from("installed @octomind/octomind@latest"),
    );
    console.log = vi.fn();
    console.error = vi.fn();
    process.exit = vi.fn(() => {
      throw new Error("Process exit");
    });
  });

  it("updates successfully when package.json exists and npm is available", async () => {
    await update();

    expect(child_process.execSync).toHaveBeenCalledWith(
      "npm install @octomind/octomind@latest",
      { cwd: path.dirname(mockPathToRoot) },
    );
  });

  it("exits with error if package.json does not exist", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await expect(update()).rejects.toThrow("Process exit");
  });

  it("exits with error if npm is not available", async () => {
    vi.mocked(which).mockResolvedValue("");

    await expect(update()).rejects.toThrow("Process exit");
  });
});
