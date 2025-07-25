import { randomUUID } from "crypto";
import { loadConfig } from "../config";
import { spawn, ChildProcess } from "child_process";
import { createInterface } from "readline";

interface StreamResult {
  lines: string[];
  detached: boolean;
  code: number | null;
  signal?: NodeJS.Signals | null;
}

const spawnAndStreamLines = async (
  command: string,
  args: string[] = [],
  maxLines: number = 20,
): Promise<StreamResult> => {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
      shell: true,
      env: process.env,
    });

    if (!child.stdout) {
      reject(new Error("Failed to create stdout pipe"));
      return;
    }

    const rl = createInterface({
      input: child.stdout,
      crlfDelay: Infinity,
    });

    const lines: string[] = [];
    let lineCount = 0;

    rl.on("line", (line: string) => {
      lines.push(line);
      console.log(`-- ${line}`);
      lineCount++;

      if (lineCount >= maxLines) {
        rl.close();
        child.unref();
        child.stdout?.destroy();
        child.stderr?.destroy();
        resolve({ lines, detached: true, code: null, signal: null });
      }
    });

    child.on("error", (error) => {
      rl.close();
      reject(error);
    });

    child.on("exit", (code, signal) => {
      if (lineCount < maxLines) {
        console.log(`Process exited with code ${code}, signal ${signal}`);
      }
      resolve({ lines, detached: false, code, signal });
    });
  });
};

const checkDockerDaemon = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const child = spawn("docker", ["info"], { stdio: "pipe" });

    child.on("exit", (code) => {
      resolve(code === 0);
    });
  });
};

const createDockerCommand = (options: {
  apiKey: string;
  name?: string;
  username?: string;
  password?: string;
  hostNetwork?: boolean;
}): string => {
  return `docker run --rm --name PLW ${options.hostNetwork ? "--network host" : ""} -e PLW_NAME=${options.name} -e PROXY_USER=${options.username} -e PROXY_PASS=${options.password} -e APIKEY=${options.apiKey} eu.gcr.io/octomind-dev/plw:latest`;
};

export const startPrivateLocationWorker = async (options: {
  name?: string;
  username?: string;
  password?: string;
  apikey: string;
  hostNetwork?: boolean;
}) => {
  const name = options.name || "default-plw";
  const username = options.username || randomUUID().replace(/-/g, "");
  const password = options.password || randomUUID().replace(/-/g, "");

  const { apiKey } = await loadConfig();
  if (!apiKey) {
    throw new Error(
      "API key is required. Please configure it first by running 'octomind init'",
    );
  }
  const command = createDockerCommand({
    name,
    username,
    password,
    apiKey,
    hostNetwork: options.hostNetwork,
  });

  if (!(await checkDockerDaemon())) {
    console.error(
      "Docker daemon is not running. Please start Docker and try again.",
    );
    return;
  }

  console.log(
    `executing command : '${command.replace(/APIKEY=[^\s&]*/g, "APIKEY=***")}'`,
  );
  const args = command.split(" ");
  const result = await spawnAndStreamLines(args[0], args.slice(1), 10);
  console.log(`Captured ${result.lines.length} lines`);
  console.log(`Process detached: ${result.detached}`);
};

export const stopPLW = async (): Promise<void> => {
  const command = "docker stop PLW";
  const args = command.split(" ");
  const result = await spawnAndStreamLines(args[0], args.slice(1), 10);
  if (result.code === 0) {
    console.log("Private Location Worker stopped successfully.");
  } else {
    console.error(
      `Failed to stop Private Location Worker. Exit code: ${result.code}`,
    );
  }
};
