import path from "path";
import fs from "fs/promises";

export interface Config {
  apiKey?: string;
  baseUrl?: string;
  testTargetId?: string;
}

const OCTOMIND_CONFIG_FILE = "octomind.config.json";

export function getConfigPath(): string {
  return path.join(process.cwd(), OCTOMIND_CONFIG_FILE);
}

export async function loadConfig(): Promise<Config> {
  try {
    const configPath = getConfigPath();
    const data = await fs.readFile(configPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ Error parsing configuration:", (error as Error).message);

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
