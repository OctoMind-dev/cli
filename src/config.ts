import path from "path";
import fs from "fs/promises";

export interface Config {
  apiKey?: string;
  testTargetId?: string;
}

const OCTOMIND_CONFIG_FILE = "octomind.config.json";

export function getConfigPath(): string {
  return path.join(process.cwd(), OCTOMIND_CONFIG_FILE);
}

export async function loadConfig(force?: boolean): Promise<Config> {
  try {
    const configPath = getConfigPath();
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
    const configPath = getConfigPath();
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
    console.log(`✅ Configuration saved to ${configPath}`);
  } catch (error) {
    console.error("❌ Error saving configuration:", (error as Error).message);
    process.exit(1);
  }
}
