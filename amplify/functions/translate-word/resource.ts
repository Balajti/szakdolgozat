import { defineFunction, secret } from "@aws-amplify/backend";

export const translateWord = defineFunction({
  name: "translate-word",
  resourceGroupName: "data",
  timeoutSeconds: 30, // Increased timeout for AI translation
  environment: {
    GEMINI_API_KEY: secret("GEMINI_API_KEY"),
  },
});
