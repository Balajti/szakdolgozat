import { defineFunction } from "@aws-amplify/backend";

export const generateStory = defineFunction({
  name: "generate-story-handler",
  entry: "./handler.ts",
  timeoutSeconds: 120, // Increased to 2 minutes for AI story generation
  resourceGroupName: "data",
});
