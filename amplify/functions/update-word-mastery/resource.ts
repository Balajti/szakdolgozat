import { defineFunction } from "@aws-amplify/backend";

export const updateWordMastery = defineFunction({
  name: "update-word-mastery-handler",
  entry: "./handler.ts",
  timeoutSeconds: 10,
  resourceGroupName: "data",
});
