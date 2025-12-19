import { Config, loadConfig, saveConfig } from "../config";
import { promptUser } from "../helpers";
import { getTestTargets, listTestTargets } from "./test-targets";

const selectTestTarget = async (): Promise<string> => {
  const testTargets = await getTestTargets();
  await listTestTargets({});

  if (testTargets.length === 1) {
    console.log(
      `Only one test target found, using it: ${testTargets[0].app} (${testTargets[0].id})`,
    );
    return testTargets[0].id;
  }

  const testTargetIndex = await promptUser(
    "Enter number of the test target you want to use (optional, press Enter to skip): ",
  );
  const testTargetIndexAsInt = Number.parseInt(testTargetIndex);

  if (
    Number.isNaN(testTargetIndexAsInt) ||
    testTargetIndexAsInt < 1 ||
    testTargetIndexAsInt > testTargets.length
  ) {
    console.log("❌ could not find a test target with the index you provided");
    process.exit(1);
  }
  const testTargetId = testTargets[testTargetIndexAsInt - 1].id;
  if (!testTargetId) {
    console.log("❌ could not find a test target with the index you provided");
    process.exit(1);
  }

  return testTargetId;
};

export const switchTestTarget = async () => {
  const testTargetId = await selectTestTarget();
  const existingConfig = await loadConfig();
  const newConfig: Config = {
    ...existingConfig,
    testTargetId,
  };
  await saveConfig(newConfig);
  console.log(`✨ Switched to test target: ${testTargetId}`);
};

export const init = async (options: {
  testTargetId?: string;
  apiKey: string;
  force?: boolean;
  dir?: string;
  recreateOctomindDir?: boolean;
}) => {
  try {
    console.log("🚀 Initializing configuration...\n");

    const existingConfig = await loadConfig(options.force);

    if (existingConfig.apiKey && !options.force) {
      console.log("⚠️  Configuration already exists.");
      const overwrite = await promptUser(
        "Do you want to overwrite it? (y/N): ",
      );

      if (
        overwrite.toLowerCase() !== "y" &&
        overwrite.toLowerCase() !== "yes"
      ) {
        console.log("Configuration unchanged.");
        return;
      }
    }

    if (!options.apiKey) {
      options.apiKey = await promptUser(
        "Enter your API key. Go to https://octomind.dev/docs/run-tests/execution-curl#create-an-api-key to learn how to generate one: ",
      );
      if (!options.apiKey) {
        console.log("❌ API key is required.");
        process.exit(1);
      }
    }
    // saving here to be able to use the api key for the test targets
    const newApiKeyConfig = {
      ...existingConfig,

      apiKey: options.apiKey,
    };

    await saveConfig(newApiKeyConfig);

    const testTargetId = await selectTestTarget();

    const newConfig: Config = {
      ...existingConfig,
      apiKey: options.apiKey,
      testTargetId: options.testTargetId ?? testTargetId,
    };

    await saveConfig(newConfig);

    console.log("\n✨ Initialization complete!");
  } catch (error) {
    console.error("❌ Error during initialization:", (error as Error).message);
    process.exit(1);
  }
};
