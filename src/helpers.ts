import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { loadConfig } from "./config";

export function promptUser(question: string): Promise<string> {
  const rl = createInterface({ input, output });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export const resolveTestTargetId = async (
  providedTestTargetId?: string,
): Promise<string> => {
  if (providedTestTargetId) {
    return providedTestTargetId;
  }

  const config = await loadConfig();
  if (!config.testTargetId) {
    throw new Error(
      "testTargetId is required. Please provide it as a parameter or configure it first by running 'octomind init'",
    );
  }
  return config.testTargetId;
};
