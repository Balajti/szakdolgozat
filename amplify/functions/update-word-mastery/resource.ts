import { defineFunction } from "@aws-amplify/backend";

export const updateWordMastery = defineFunction({
  entry: "./handler.ts",
  timeoutSeconds: 10,
});
