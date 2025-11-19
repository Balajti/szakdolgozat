import { defineFunction } from "@aws-amplify/backend";

export const generateStory = defineFunction({
  name: "generate-story-handler",
  entry: "./handler.ts",
  timeoutSeconds: 15,
  resourceGroupName: "data",
});
