import tabtab, { TabtabEnv } from "tabtab";
import { Command } from "commander";
import { getTestCases } from "./tools/test-cases";
import { getTestTargets } from "./tools/test-targets";
import { loadConfig } from "./config";
import { getEnvironments } from "./tools/environments";
import { BINARY_NAME } from "./cli";

const logOptions = async (command: Command, line: string) => {
  const argv = line.split(" ");
  const usedOptions = command.options.filter((option) => argv.includes(option.long!) || argv.includes(option.short!)).map((option) => option.flags);
  tabtab.log(command.options.filter((option) => option.long)
    .filter((option) => !usedOptions.includes(option.flags))
    .map((option) => option.long!));
  tabtab.log(command.options.filter((option) => option.short)
    .filter((option) => !usedOptions.includes(option.flags))
    .map((option) => option.short!));
}

const completion = async (env: TabtabEnv, program: Command) => {
  if (!env.complete) return;
 
  const argv = env.line.split(" ");

  const command = program.commands.find((command) => command.name() === argv[1]);
  if (command) {
    if( env.prev === "-t" || env.prev === "--test-target-id") {
      const testTargets = await getTestTargets();
      tabtab.log(testTargets.map((testTarget) => testTarget.id));
      return;
    }
    if( command.name() === "test-case" && (env.prev === "-c" || env.prev === "--test-case-id") ) {
      const config = await loadConfig();
        if( config.testTargetId ) {
        const testCases = await getTestCases({ testTargetId: config.testTargetId, status: "ENABLED" });
        tabtab.log(testCases.map((testCase) => testCase.id));
        return;
      }
    }
    if( (command.name() === "update-environment" || command.name() === "delete-environment"|| command.name() === "environment") 
        && (env.prev === "-e" || env.prev === "--environment-id") ) {
      const config = await loadConfig();
        if( config.testTargetId ) {
        const environments = await getEnvironments({ testTargetId: config.testTargetId });
        tabtab.log(environments.map((environment) => environment.id));
        return;
      }
    }
    await logOptions(command, env.line);
    return;
  }

  tabtab.log(["--help"]);
  tabtab.log(program.options.filter((option) => option.long).map((option) => option.long!));
  tabtab.log(program.options.filter((option) => option.short).map((option) => option.short!));
  tabtab.log(program.commands.map((command) => command.name()));
};

export const installCompletion = async () => {
  await tabtab
    .install({
      name: BINARY_NAME,
      completer: BINARY_NAME
    })
    .catch(err => console.error('INSTALL ERROR', err));
}

export const uninstallCompletion = async () => {
  await tabtab
    .uninstall({
      name: BINARY_NAME,
    })
    .catch(err => console.error('UNINSTALL ERROR', err));
}

export const tabCompletion = async (program: Command) => {
  const env = tabtab.parseEnv(process.env);
  await completion(env, program);
}