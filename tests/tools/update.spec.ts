import * as child_process from "node:child_process";
import fs from "fs";
import { homedir } from "os";
import path from "path";

import which from "which";

import { update } from "../../src/tools/update";

jest.mock("node:child_process");
jest.mock("fs");
jest.mock("which");

describe("update", () => {
  const mockPathToRoot = path.posix.normalize(
    path.join(homedir(), "/.local/packages"),
  );

  beforeEach(() => {
    jest.mocked(fs.existsSync).mockReturnValue(true);
    jest.mocked(which).mockResolvedValue("/usr/bin/npm");
    jest
      .mocked(child_process.execSync)
      .mockReturnValue(Buffer.from("installed @octomind/octomind@latest"));
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn(() => {
      throw new Error("Process exit");
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("updates successfully when package.json exists and npm is available", async () => {
    await update();

    expect(child_process.execSync).toHaveBeenCalledWith(
      "npm install @octomind/octomind@latest",
      { cwd: path.dirname(mockPathToRoot) },
    );
  });

  it("exits with error if package.json does not exist", async () => {
    jest.mocked(fs.existsSync).mockReturnValue(false);

    await expect(update()).rejects.toThrow("Process exit");
  });

  it("exits with error if npm is not available", async () => {
    jest.mocked(which).mockResolvedValue("");

    await expect(update()).rejects.toThrow("Process exit");
  });
});
