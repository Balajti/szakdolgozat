import { defineFunction } from "@aws-amplify/backend";

export const postConfirmation = defineFunction({
  name: "post-confirmation",
  resourceGroupName: "auth",
  timeoutSeconds: 10, // profile creation via AppSync needs SSM config on cold start
});
