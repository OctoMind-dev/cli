import fs from "fs/promises";
import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

const OCTOMIND_CONFIG_FILE = "octomind.json";
const CONFIG_DIR = ".config";

export async function getConfigPath(ensureDir?: boolean): Promise<string> {
  const homeDir = homedir();
  const configDir = join(homeDir, CONFIG_DIR);
  const configPath = join(configDir, OCTOMIND_CONFIG_FILE);
  
  if (ensureDir && !existsSync(configDir)) {
    await fs.mkdir(configDir, { recursive: true });
  }
  
  return configPath;
}

export interface Config {
  apiKey?: string;
  testTargetId?: string;
}

export async function loadConfig(force?: boolean): Promise<Config> {
  try {
    const configPath = await getConfigPath();
    const data = await fs.readFile(configPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // only exit on overwrite attempt
    if (force) {
      console.error(
        "❌ Error parsing configuration:",
        (error as Error).message
      );
      process.exit(1);
    }
    return {};
  }
}

export async function saveConfig(config: Config): Promise<void> {
  try {
    const configPath = await getConfigPath(true);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
    console.log(`✅ Configuration saved to ${configPath}`);
  } catch (error) {
    console.error("❌ Error saving configuration:", (error as Error).message);
    process.exit(1);
  }
}
