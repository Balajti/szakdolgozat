import { defineFunction } from "@aws-amplify/backend";

export const listStories = defineFunction({
  entry: "./handler.ts",
  timeoutSeconds: 10,
});
