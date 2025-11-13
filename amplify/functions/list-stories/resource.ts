import { defineFunction } from "@aws-amplify/backend";

export const listStories = defineFunction({
  name: "list-stories-handler",
  entry: "./handler.ts",
  timeoutSeconds: 10,
});
