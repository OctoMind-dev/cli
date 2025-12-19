import { log, TabtabEnv } from "tabtab";

import {
  CompletableCommand,
  environmentIdCompleter,
  optionsCompleter,
  testCaseIdCompleter,
  testReportIdCompleter,
  testTargetIdCompleter,
} from "../src/completion";
import { loadConfig } from "../src/config";
import { getEnvironments } from "../src/tools/environments";
import { getTestCases } from "../src/tools/test-cases";
import { getTestReports } from "../src/tools/test-reports";
import { getTestTargets } from "../src/tools/test-targets";

jest.mock("../src/tools/test-targets");
jest.mock("tabtab");
jest.mock("../src/config");
jest.mock("../src/tools/environments");
jest.mock("../src/tools/test-cases");
jest.mock("../src/tools/test-reports");

describe("completion", () => {
  const env: TabtabEnv = {
    line: "debug --test-target-id",
    prev: "--test-target-id",
    complete: false,
    words: 3,
    point: 0,
    partial: "",
    last: "",
    lastPartial: "",
  };

  const mockCommand: CompletableCommand = {
    name: jest.fn(),
    getCompleter: jest.fn(),
    options: [
      {
        flags: "--test-target-id, -t",
        name: "test-target-id",
        type: "string",
        short: "-t",
        long: "--test-target-id",
      },
      {
        flags: "--environment-id, -e",
        name: "environment-id",
        type: "string",
        short: "-e",
        long: "--environment-id",
      },
      {
        flags: "--test-case-id, -c",
        name: "test-case-id",
        type: "string",
        short: "-c",
        long: "--test-case-id",
      },
      {
        flags: "--test-report-id, -r",
        name: "test-report-id",
        type: "string",
        short: "-r",
        long: "--test-report-id",
      },
    ],
  } as unknown as CompletableCommand;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should complete test target id", async () => {
    (getTestTargets as jest.Mock).mockResolvedValue([
      {
        id: "test-target-1",
        app: "test-app-1",
      },
      {
        id: "test-target-2",
        app: "test-app-2",
      },
    ]);
    const result = await testTargetIdCompleter(mockCommand, env);
    expect(result).toEqual(true);
    expect(log).toHaveBeenCalledWith(["test-target-1", "test-target-2"]);
  });

  it("should not complete test target id when prev is not --test-target-id", async () => {
    env.prev = "-c";
    const result = await testTargetIdCompleter(mockCommand, env);
    expect(result).toEqual(false);
    expect(log).not.toHaveBeenCalled();
  });

  it("should complete environment id", async () => {
    (loadConfig as jest.Mock).mockResolvedValue({
      testTargetId: "test-target-1",
    });
    (getEnvironments as jest.Mock).mockResolvedValue([
      {
        id: "environment-1",
        name: "environment-1",
      },
      {
        id: "environment-2",
        name: "environment-2",
      },
    ]);
    env.prev = "-e";
    const result = await environmentIdCompleter(mockCommand, env);
    expect(result).toEqual(true);
    expect(log).toHaveBeenCalledWith(["environment-1", "environment-2"]);
  });

  it("should not complete environment id when prev is not --environment-id", async () => {
    env.prev = "-c";
    const result = await environmentIdCompleter(mockCommand, env);
    expect(result).toEqual(false);
    expect(log).not.toHaveBeenCalled();
  });

  it("should complete test case id", async () => {
    (loadConfig as jest.Mock).mockResolvedValue({
      testTargetId: "test-target-1",
    });
    (getTestCases as jest.Mock).mockResolvedValue([
      {
        id: "test-case-1",
        name: "test-case-1",
      },
      {
        id: "test-case-2",
        name: "test-case-2",
      },
    ]);
    env.prev = "-c";
    const result = await testCaseIdCompleter(mockCommand, env);
    expect(result).toEqual(true);
    expect(log).toHaveBeenCalledWith(["test-case-1", "test-case-2"]);
  });

  it("should not complete test case id when prev is not --test-case-id", async () => {
    env.prev = "-r";
    const result = await testCaseIdCompleter(mockCommand, env);
    expect(result).toEqual(false);
    expect(log).not.toHaveBeenCalled();
  });

  it("should complete test report id", async () => {
    (loadConfig as jest.Mock).mockResolvedValue({
      testTargetId: "test-target-1",
    });
    (getTestReports as jest.Mock).mockResolvedValue([
      {
        id: "test-report-1",
        name: "test-report-1",
      },
      {
        id: "test-report-2",
        name: "test-report-2",
      },
    ]);
    env.prev = "-r";
    const result = await testReportIdCompleter(mockCommand, env);
    expect(result).toEqual(true);
    expect(log).toHaveBeenCalledWith(["test-report-1", "test-report-2"]);
  });

  it("should not complete test report id when prev is not --test-report-id", async () => {
    env.prev = "-c";
    const result = await testReportIdCompleter(mockCommand, env);
    expect(result).toEqual(false);
    expect(log).not.toHaveBeenCalled();
  });

  it("should complete options of command", async () => {
    const result = await optionsCompleter(mockCommand, env);
    expect(result).toEqual(true);
    expect(log).toHaveBeenNthCalledWith(1, [
      "--environment-id",
      "--test-case-id",
      "--test-report-id",
    ]);
    expect(log).toHaveBeenNthCalledWith(2, ["-e", "-c", "-r"]);
  });
});
