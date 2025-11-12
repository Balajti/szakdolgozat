import { defineFunction } from "@aws-amplify/backend";

export const generateStory = defineFunction({
  entry: "./handler.ts",
  timeoutSeconds: 25,
  memoryMB: 1024,
});
