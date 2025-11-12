import { defineFunction } from "@aws-amplify/backend";

export const listAssignments = defineFunction({
  entry: "./handler.ts",
  timeoutSeconds: 10,
});
