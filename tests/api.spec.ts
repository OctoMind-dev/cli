import axios from "axios";
import {
  createEnvironment,
  deleteEnvironment,
  executeTests,
  getTestReport,
  listEnvironments,
  listPrivateLocations,
  registerLocation,
  unregisterLocation,
  updateEnvironment,
  getNotifications,
  getTestCase,
  createDiscovery,
} from "../src/api";
import {
  CreateEnvironmentOptions,
  DeleteEnvironmentOptions,
  ExecuteTestsOptions,
  GetTestReportOptions,
  ListEnvironmentsOptions,
  ListPrivateLocationsOptions,
  RegisterLocationOptions,
  UnregisterLocationOptions,
  UpdateEnvironmentOptions,
  GetNotificationsOptions,
  GetTestCaseOptions,
  CreateDiscoveryOptions,
} from "../src/types";

jest.mock("axios");
const mockedAxios = jest.mocked(axios);

describe("CLI Commands", () => {
  const apiKey = "test-api-key";
  const BASE_URL = "https://app.octomind.dev";
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("executeTests", async () => {
    const options: ExecuteTestsOptions = {
      apiKey,
      testTargetId: "test-target-id",
      url: "https://example.com",
      environment: "default",
      description: "Test description",
      json: true,
    };

    mockedAxios.mockResolvedValue({
      data: {
        testReportUrl: "https://example.com",
        testReport: { status: "PASSED", testResults: [] },
      },
    });

    await executeTests(options);

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "post",
        url: `${BASE_URL}/api/apiKey/v2/execute`,
        data: expect.any(Object),
        headers: expect.objectContaining({
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("getTestReport", async () => {
    const options: GetTestReportOptions = {
      apiKey,
      testTargetId: "test-target-id",
      reportId: "test-report-id",
      json: true,
    };

    mockedAxios.mockResolvedValue({
      data: {
        status: "PASSED",
        executionUrl: "https://example.com",
        testResults: [],
      },
    });

    await getTestReport(options);

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "get",
        url: `${BASE_URL}/api/apiKey/v2/test-targets/test-target-id/test-reports/test-report-id`,
        headers: expect.objectContaining({
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("registerLocation", async () => {
    const options: RegisterLocationOptions = {
      apiKey,
      name: "test-location",
      proxypass: "password",
      proxyuser: "user",
      address: "address",
      json: true,
    };

    mockedAxios.mockResolvedValue({ data: { success: true } });

    await registerLocation(options);

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "put",
        url: `${BASE_URL}/api/apiKey/v1/private-location/register`,
        data: expect.any(Object),
        headers: expect.objectContaining({
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("unregisterLocation", async () => {
    const options: UnregisterLocationOptions = {
      apiKey,
      name: "test-location",
      json: true,
    };

    mockedAxios.mockResolvedValue({ data: { success: true } });

    await unregisterLocation(options);

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "put",
        url: `${BASE_URL}/api/apiKey/v1/private-location/unregister`,
        data: expect.any(Object),
        headers: expect.objectContaining({
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("listPrivateLocations", async () => {
    const options: ListPrivateLocationsOptions = {
      apiKey,
      json: true,
    };

    mockedAxios.mockResolvedValue({
      data: [{ name: "location1", status: "ONLINE", address: "address1" }],
    });

    await listPrivateLocations(options);

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "get",
        url: `${BASE_URL}/api/apiKey/v1/private-location`,
        headers: expect.objectContaining({
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("listEnvironments", async () => {
    const options: ListEnvironmentsOptions = {
      apiKey,
      testTargetId: "test-target-id",
      json: true,
    };

    mockedAxios.mockResolvedValue({
      data: [
        {
          id: "env1",
          name: "env1",
          discoveryUrl: "https://example.com",
          updatedAt: "2023-01-01",
        },
      ],
    });

    await listEnvironments(options);

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "get",
        url: `${BASE_URL}/api/apiKey/v2/test-targets/test-target-id/environments`,
        headers: expect.objectContaining({
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("createEnvironment", async () => {
    const options: CreateEnvironmentOptions = {
      apiKey,
      testTargetId: "test-target-id",
      name: "env1",
      discoveryUrl: "https://example.com",
      json: true,
    };

    mockedAxios.mockResolvedValue({
      data: {
        id: "env1",
        name: "env1",
        discoveryUrl: "https://example.com",
        updatedAt: "2023-01-01",
      },
    });

    await createEnvironment(options);

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "post",
        url: `${BASE_URL}/api/apiKey/v2/test-targets/test-target-id/environments`,
        data: expect.any(Object),
        headers: expect.objectContaining({
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("updateEnvironment", async () => {
    const options: UpdateEnvironmentOptions = {
      apiKey,
      testTargetId: "test-target-id",
      environmentId: "env1",
      name: "env1-updated",
      discoveryUrl: "https://example.com",
      json: true,
    };

    mockedAxios.mockResolvedValue({
      data: {
        id: "env1",
        name: "env1-updated",
        discoveryUrl: "https://example.com",
        updatedAt: "2023-01-01",
      },
    });

    await updateEnvironment(options);

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "patch",
        url: `${BASE_URL}/api/apiKey/v2/test-targets/test-target-id/environments/env1`,
        data: expect.any(Object),
        headers: expect.objectContaining({
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("deleteEnvironment", async () => {
    const options: DeleteEnvironmentOptions = {
      apiKey,
      testTargetId: "test-target-id",
      environmentId: "env1",
      json: true,
    };

    mockedAxios.mockResolvedValue({ data: { success: true } });

    await deleteEnvironment(options);

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "delete",
        url: `${BASE_URL}/api/apiKey/v2/test-targets/test-target-id/environments/env1`,
        headers: expect.objectContaining({
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("getNotifications", async () => {
    const options: GetNotificationsOptions = {
      apiKey,
      testTargetId: "test-target-id",
      json: true,
    };

    mockedAxios.mockResolvedValue({
      data: [
        {
          id: "notification1",
          testTargetId: "test-target-id",
          createdAt: "2025-03-23T10:58:23.479Z",
          updatedAt: "2025-03-23T10:58:23.479Z",
          payload: {
            failed: false,
            context: {
              source: "manual",
              description: "manual test run",
              triggeredBy: {
                type: "USER",
                userId: "user-id",
              },
            },
            testReportId: "report-id",
          },
          type: "REPORT_EXECUTION_FINISHED",
          ack: null,
        },
      ],
    });

    await getNotifications(options);

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "get",
        url: `${BASE_URL}/api/apiKey/v2/test-targets/test-target-id/notifications`,
        headers: expect.objectContaining({
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("getTestCase", async () => {
    const options: GetTestCaseOptions = {
      apiKey,
      testTargetId: "test-target-id",
      testCaseId: "test-case-id",
      json: true,
    };

    mockedAxios.mockResolvedValue({
      data: {
        id: "test-case-id",
        testTargetId: "test-target-id",
        type: null,
        elements: [
          {
            id: "element1",
            index: 0,
            interaction: {
              id: "interaction1",
              action: "CLICK",
              testCaseElementId: "element1",
            },
            selectors: [
              {
                id: "selector1",
                index: 0,
                selector: "button",
                selectorType: "ROLE",
                options: { name: "Submit" },
                testCaseElementId: "element1",
                scrollStateId: null,
              },
            ],
            testCaseId: "test-case-id",
            ignoreFailure: false,
          },
        ],
        createdAt: "2025-03-20T21:44:49.186Z",
        updatedAt: "2025-03-22T14:09:46.078Z",
        description: "Test case description",
        status: "ENABLED",
        externalId: null,
        entryPointUrlPath: null,
        tags: [],
        createdBy: "EDIT",
        runStatus: "ON",
      },
    });

    await getTestCase(options);

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "get",
        url: `${BASE_URL}/api/apiKey/v2/test-targets/test-target-id/test-cases/test-case-id`,
        headers: expect.objectContaining({
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("createDiscovery", async () => {
    const options: CreateDiscoveryOptions = {
      apiKey,
      testTargetId: "test-target-id",
      name: "discovery1",
      prompt: "make sure current time is visible",
      entryPointUrlPath: "/path",
      assignedTagIds: ["tag1", "tag2"],
      json: true,
    };

    mockedAxios.mockResolvedValue({
      data: {
        discoveryId: "discovery-id",
        testCaseId: "test-case-id",
      },
    });

    await createDiscovery(options);

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "post",
        url: `${BASE_URL}/api/apiKey/v2/test-targets/test-target-id/discoveries`,
        data: expect.objectContaining({
          name: "discovery1",
          prompt: "make sure current time is visible",
          entryPointUrlPath: "/path",
          assignedTagIds: ["tag1", "tag2"],
        }),
        headers: expect.objectContaining({
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        }),
      }),
    );
  });
});
