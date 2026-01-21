import type { components, paths } from "../api";
import { client, handleError } from "./client";

export type TestPlanResponse = components["schemas"]["ExternalTestPlanSchema"];
export type GetTestPlanParams =
  paths["/apiKey/beta/test-plans/{id}"]["get"]["parameters"]["path"];

export const getTestPlan = async (
  options: GetTestPlanParams,
): Promise<TestPlanResponse> => {
  const { data, error } = await client.GET("/apiKey/beta/test-plans/{id}", {
    params: {
      path: {
        id: options.id,
      },
    },
  });

  handleError(error);

  if (!data) {
    throw new Error(`No test plan with id ${options.id} found`);
  }

  return data;
};
