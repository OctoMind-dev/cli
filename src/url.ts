import { loadConfig } from "./config";
import { BASE_URL } from "./tools/client";

export const getUrl = async (
  input:
    | { testTargetId: string; entityType: "test-target" }
    | { testCaseId: string; entityType: "test-case" }
    | { testReportId: string; entityType: "test-report" }
    | {
        testReportId: string;
        testResultId: string;
        entityType: "test-result";
      }
    | { testCaseId: string; entityType: "discovery" },
): Promise<string> => {
  const relevantBaseUrl = new URL(BASE_URL).origin;
  const config = await loadConfig();
  const testTargetId = config.testTargetId;
  if (!testTargetId) {
    throw new Error("Test target id is not set");
  }
  switch (input.entityType) {
    case "test-case":
      return `${relevantBaseUrl}/testtargets/${testTargetId}/testcases?testCaseId=${input.testCaseId}`;
    case "test-target":
      return `${relevantBaseUrl}/testtargets/${testTargetId}`;
    case "test-report":
      return `${relevantBaseUrl}/testtargets/${testTargetId}/testreports/${input.testReportId}`;
    case "test-result":
      return `${relevantBaseUrl}/testtargets/${testTargetId}/testreports/${input.testReportId}/testresults/${input.testResultId}`;
    case "discovery":
      return `${relevantBaseUrl}/testtargets/${testTargetId}/testcases/${input.testCaseId}`;
  }
};
