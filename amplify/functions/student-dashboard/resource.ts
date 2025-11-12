import { defineFunction } from "@aws-amplify/backend";

export const studentDashboard = defineFunction({
  entry: "./handler.ts",
  timeoutSeconds: 10,
});
