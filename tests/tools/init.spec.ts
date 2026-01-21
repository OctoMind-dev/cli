import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { loadConfig, saveConfig } from "../../src/config";
import { promptUser } from "../../src/helpers";
import { init } from "../../src/tools/init";
import { getTestTargets } from "../../src/tools/test-targets";
import { mockLogger } from "../setup";

vi.mock("../../src/config");
vi.mock("../../src/helpers");
vi.mock("../../src/tools/test-targets");

describe("init", () => {
  let loadConfigMock: Mock<typeof loadConfig>;
  let promptUserMock: Mock<typeof promptUser>;
  let getTestTargetsMock: Mock<typeof getTestTargets>;

  beforeEach(() => {
    loadConfigMock = vi.mocked(loadConfig);
    loadConfigMock.mockResolvedValue({ apiKey: "apiKey" });

    promptUserMock = vi.mocked(promptUser);
    promptUserMock.mockResolvedValue("1");

    getTestTargetsMock = vi.mocked(getTestTargets);
    getTestTargetsMock.mockResolvedValue([
      { id: "testTargetId", app: "testTargetApp" },
    ]);
  });

  it("should initialize the configuration with one test target", async () => {
    await init({ apiKey: "newApiKey", force: true });
    expect(loadConfigMock).toHaveBeenCalledWith(true);
    expect(saveConfig).toHaveBeenCalledWith({
      apiKey: "newApiKey",
      testTargetId: "testTargetId",
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Only one test target found, using it: testTargetApp (testTargetId)",
    );
    expect(mockLogger.info).toHaveBeenNthCalledWith(
      3,
      "\n✨ Initialization complete!",
    );
  });

  it("should initialize the configuration with multiple test targets", async () => {
    getTestTargetsMock.mockResolvedValue([
      { id: "testTargetId1", app: "testTargetApp1" },
      { id: "testTargetId2", app: "testTargetApp2" },
    ]);
    await init({ apiKey: "newApiKey", force: true });
    expect(loadConfigMock).toHaveBeenCalledWith(true);
    expect(saveConfig).toHaveBeenCalledWith({
      apiKey: "newApiKey",
      testTargetId: "testTargetId1",
    });
    expect(mockLogger.info).toHaveBeenNthCalledWith(
      2,
      "\n✨ Initialization complete!",
    );
  });
});
