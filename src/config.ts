import { existsSync } from "fs";
import fs from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const CONFIG_DIR = ".config";

export async function getConfigPath(ensureDir?: boolean): Promise<string> {
  const configFilePath = process.env.OCTOMIND_CONFIG_FILE || "octomind.json";

  const homeDir = homedir();
  const configDir = join(homeDir, CONFIG_DIR);
  const configPath = join(configDir, configFilePath);

  if (ensureDir && !existsSync(configDir)) {
    await fs.mkdir(configDir, { recursive: true });
  }

  return configPath;
}

export interface Config {
  apiKey?: string;
  testTargetId?: string;
}

let configLoaded = false;
let config: Config = {};

export function resetConfig() {
  configLoaded = false;
  config = {};
}

export async function loadConfig(force?: boolean): Promise<Config> {
  if (configLoaded && !force) {
    return config;
  }
  try {
    const configPath = await getConfigPath();
    const data = await fs.readFile(configPath, "utf8");
    config = JSON.parse(data);
    configLoaded = true;
    return config;
  } catch (error) {
    // only exit on overwrite attempt
    if (force) {
      console.error(
        "❌ Error parsing configuration:",
        (error as Error).message,
      );
      process.exit(1);
    }
    return {};
  }
}

export async function saveConfig(newConfig: Config): Promise<void> {
  try {
    const configPath = await getConfigPath(true);
    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2), "utf8");
    console.log(`✅ Configuration saved to ${configPath}`);
    configLoaded = false;
  } catch (error) {
    console.error("❌ Error saving configuration:", (error as Error).message);
    process.exit(1);
  }
}
