import { defineFunction } from "@aws-amplify/backend";

export const listAssignments = defineFunction({
  name: "list-assignments-handler",
  entry: "./handler.ts",
  timeoutSeconds: 10,
  resourceGroupName: "data",
});
