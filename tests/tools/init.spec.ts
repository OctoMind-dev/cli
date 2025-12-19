import { init } from "../../src/tools/init";
import { loadConfig, saveConfig } from "../../src/config";
import { promptUser } from "../../src/helpers";
import { getTestTargets } from "../../src/tools/test-targets";
jest.mock("../../src/config");
jest.mock("../../src/helpers");
jest.mock("../../src/tools/test-targets");

describe("init", () => {
  const originalConsoleLog = console.log;
  beforeAll(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
  });
  afterAll(() => {
    console.log = originalConsoleLog;
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const loadConfigMock = loadConfig as jest.Mock;
  loadConfigMock.mockResolvedValue({ apiKey: "apiKey" });
  const promptUserMock = promptUser as jest.Mock;
  promptUserMock.mockResolvedValue("1");
  const getTestTargetsMock = getTestTargets as jest.Mock;
  getTestTargetsMock.mockResolvedValue([{ id: "testTargetId", app: "testTargetApp" }]);

  it("should initialize the configuration with one test target", async () => {
    await init({ apiKey: "newApiKey", force: true });
    expect(loadConfigMock).toHaveBeenCalledWith(true);
    expect(saveConfig).toHaveBeenCalledWith({ apiKey: "newApiKey", testTargetId: "testTargetId" });
    expect(console.log).toHaveBeenCalledWith("Only one test target found, using it: testTargetApp (testTargetId)");
    expect(console.log).toHaveBeenNthCalledWith(3, "\n✨ Initialization complete!");
  });

  it("should initialize the configuration with multiple test targets", async () => {
    getTestTargetsMock.mockResolvedValue([
      { id: "testTargetId1", app: "testTargetApp1" },
      { id: "testTargetId2", app: "testTargetApp2" },
    ]);
    await init({ apiKey: "newApiKey", force: true });
    expect(loadConfigMock).toHaveBeenCalledWith(true);
    expect(saveConfig).toHaveBeenCalledWith({ apiKey: "newApiKey", testTargetId: "testTargetId1" });
    expect(console.log).toHaveBeenNthCalledWith(2, "\n✨ Initialization complete!");
  });
});
