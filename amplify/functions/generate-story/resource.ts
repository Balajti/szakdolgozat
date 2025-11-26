import { defineFunction, secret } from "@aws-amplify/backend";

export const generateStory = defineFunction({
  name: "generate-story-handler",
  entry: "./handler.ts",
  timeoutSeconds: 180, // Increased to 3 minutes for AI story generation with preferences
  resourceGroupName: "data",
  environment: {
    GEMINI_API_KEY: secret("GEMINI_API_KEY"),
  },
});
