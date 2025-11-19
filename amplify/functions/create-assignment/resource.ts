import { defineFunction } from "@aws-amplify/backend";

export const createAssignment = defineFunction({
  name: "create-assignment-handler",
  entry: "./handler.ts",
  timeoutSeconds: 10,
  resourceGroupName: "data",
});
