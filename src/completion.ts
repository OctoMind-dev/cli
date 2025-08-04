import { Command } from "commander";
import { parse } from "shell-quote";
import { install, log, parseEnv, TabtabEnv, uninstall } from "tabtab";

import { BINARY_NAME } from "./cli";
import { loadConfig } from "./config";
import { getTestReports } from "./tools";
import { getEnvironments } from "./tools/environments";
import { getTestCases } from "./tools/test-cases";
import { getTestTargets } from "./tools/test-targets";

// returns whether the completer has handled the completion
type CompleterFn = (
  command: CompletableCommand,
  env: TabtabEnv,
) => Promise<boolean>;

export class CompletableCommand extends Command {
  private _completerFn: CompleterFn[] = [];

  completer(completerFn?: CompleterFn): CompletableCommand {
    if (completerFn) {
      this._completerFn.push(completerFn);
    }
    return this;
  }

  getCompleter(): CompleterFn[] {
    return this._completerFn;
  }

  override createCommand(name?: string): CompletableCommand {
    return new CompletableCommand(name);
  }

  // Helper method to create completable commands
  completableCommand(
    nameAndArgs: string,
    description?: string,
  ): CompletableCommand {
    const cmd = description
      ? this.command(nameAndArgs, description)
      : this.command(nameAndArgs);
    // Ensure it has the right prototype
    Object.setPrototypeOf(cmd, CompletableCommand.prototype);
    return cmd as CompletableCommand;
  }
}

const includesOrUndefined = <T>(
  array: (T | undefined)[],
  value: T | undefined,
): boolean => {
  return (
    array.includes(value) || (value === undefined && array.includes(undefined))
  );
};

const logOptions = async (command: CompletableCommand, line: string) => {
  const argv = parse(line).map((arg) => arg.toString());
  const usedOptions = command.options
    .filter(
      (option) =>
        includesOrUndefined(argv, option.long) ||
        includesOrUndefined(argv, option.short),
    )
    .map((option) => option.flags);
  log(
    command.options
      .filter((option) => option.long)
      .filter((option) => !usedOptions.includes(option.flags))
      .map((option) => option.long ?? ""),
  );
  log(
    command.options
      .filter((option) => option.short)
      .filter((option) => !usedOptions.includes(option.flags))
      .map((option) => option.short ?? ""),
  );
};

export const optionsCompleter = async (
  command: CompletableCommand,
  env: TabtabEnv,
): Promise<boolean> => {
  await logOptions(command, env.line);
  return true;
};

export const testTargetIdCompleter = async (
  _command: CompletableCommand,
  env: TabtabEnv,
): Promise<boolean> => {
  if (env.prev === "-t" || env.prev === "--test-target-id") {
    const testTargets = await getTestTargets();
    log(testTargets.map((testTarget) => testTarget.id));
    return true;
  }
  return false;
};

export const environmentIdCompleter = async (
  _command: CompletableCommand,
  env: TabtabEnv,
): Promise<boolean> => {
  if (env.prev === "-e" || env.prev === "--environment-id") {
    const config = await loadConfig();
    if (config.testTargetId) {
      const environments = await getEnvironments({
        testTargetId: config.testTargetId,
      });
      log(environments.map((environment) => environment.id));
      return true;
    }
  }
  return false;
};

export const testCaseIdCompleter = async (
  _command: CompletableCommand,
  env: TabtabEnv,
): Promise<boolean> => {
  if (env.prev === "-c" || env.prev === "--test-case-id") {
    const config = await loadConfig();
    if (config.testTargetId) {
      const testCases = await getTestCases({
        testTargetId: config.testTargetId,
        status: "ENABLED",
      });
      log(testCases.map((testCase) => testCase.id));
      return true;
    }
  }
  return false;
};

export const testReportIdCompleter = async (
  _command: CompletableCommand,
  env: TabtabEnv,
): Promise<boolean> => {
  if (env.prev === "-r" || env.prev === "--test-report-id") {
    const config = await loadConfig();
    if (config.testTargetId) {
      const testReports = await getTestReports({
        testTargetId: config.testTargetId,
      });
      if (testReports) {
        log(testReports.map((testReport) => testReport?.id ?? ""));
      }
    }
    return true;
  }
  return false;
};

export const tabCompletion = async (program: CompletableCommand) => {
  const env = parseEnv(process.env);
  if (!env.complete) return;

  const argv = parse(env.line).map((arg) => arg.toString());

  const command = program.commands.find(
    (c) => c.name() === argv[1],
  ) as CompletableCommand;
  if (command) {
    const completers = command.getCompleter();
    if (completers.length > 0) {
      for (const completer of completers) {
        const handled = await completer(command, env);
        if (handled) {
          return;
        }
      }
    }
    return;
  }

  log(["--help"]);
  log(
    program.options
      .filter((option) => option.long)
      .map((option) => option.long ?? ""),
  );
  log(
    program.options
      .filter((option) => option.short)
      .map((option) => option.short ?? ""),
  );
  log(program.commands.map((c) => c.name()));
};

export const installCompletion = async () => {
  await install({
    name: BINARY_NAME,
    completer: BINARY_NAME,
  }).catch((err) => console.error("INSTALL ERROR", err));
};

export const uninstallCompletion = async () => {
  await uninstall({
    name: BINARY_NAME,
  }).catch((err) => console.error("UNINSTALL ERROR", err));
};
