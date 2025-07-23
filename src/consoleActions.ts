import { createInterface } from "node:readline";
import { stdin as input, stdout as output } from "node:process";

export function promptUser(question: string): Promise<string> {
  const rl = createInterface({ input, output });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
