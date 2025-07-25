import { client, handleError } from "./client";

export const getTestTargets = async () => {
  const { data, error } = await client.GET("/apiKey/v2/test-targets");

  handleError(error);

  if (!data) {
    throw Error("No test targets found");
  }

  return data;
};
