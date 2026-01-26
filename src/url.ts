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
    | { testCaseId: string; entityType: "discovery" }
    | { batchGenerationId: string; entityType: "batch-generation" },
): Promise<string> => {
  const config = await loadConfig();
  const configuredTestTargetId = config.testTargetId;
  if (!configuredTestTargetId && input.entityType !== "test-target") {
    return "";
  }
  switch (input.entityType) {
    case "test-case":
      return `${BASE_URL}/testtargets/${configuredTestTargetId}/testcases?testCaseId=${input.testCaseId}`;
    case "test-target":
      return `${BASE_URL}/testtargets/${input.testTargetId}`;
    case "test-report":
      return `${BASE_URL}/testtargets/${configuredTestTargetId}/testreports/${input.testReportId}`;
    case "test-result":
      return `${BASE_URL}/testtargets/${configuredTestTargetId}/testreports/${input.testReportId}/testresults/${input.testResultId}`;
    case "discovery":
      return `${BASE_URL}/testtargets/${configuredTestTargetId}/testcases/${input.testCaseId}`;
    case "batch-generation":
      return `${BASE_URL}/testtargets/${configuredTestTargetId}/batch-generations/${input.batchGenerationId}`;
  }
};
