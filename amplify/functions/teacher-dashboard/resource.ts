import { defineFunction } from "@aws-amplify/backend";

export const teacherDashboard = defineFunction({
  entry: "./handler.ts",
  timeoutSeconds: 10,
});
