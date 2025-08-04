import { deleteTestCase } from "../../src/tools/test-cases";
import { handleError, client } from "../../src/tools/client";

jest.mock("../../src/tools/client");

describe("test-cases", () => {
  let clientDELETE: jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    clientDELETE = client.DELETE as jest.Mock;
    console.log = jest.fn();
  });

  it("should delete a test case", async () => {
    clientDELETE.mockResolvedValue({
      data: { success: true },
      error: undefined,
    });
    await deleteTestCase({
      testTargetId: "test-target-id",
      testCaseId: "test-case-id",
    });
    expect(handleError).toHaveBeenCalledWith(undefined);
    expect(console.log).toHaveBeenCalledWith("Test Case deleted successfully");
  });

  it("should handle error", async () => {
    clientDELETE.mockResolvedValue({
      data: undefined,
      error: { message: "error" },
    });
    await deleteTestCase({
      testTargetId: "test-target-id",
      testCaseId: "test-case-id",
    });
    expect(handleError).toHaveBeenCalledWith({ message: "error" });
  });
});
