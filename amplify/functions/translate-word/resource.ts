import { defineFunction } from "@aws-amplify/backend";

export const translateWord = defineFunction({
  name: "translate-word",
  resourceGroupName: "data",
  timeoutSeconds: 30, // Increased timeout for AI translation
});
