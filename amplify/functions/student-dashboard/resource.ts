import { defineFunction } from "@aws-amplify/backend";

export const studentDashboard = defineFunction({
  name: "student-dashboard-handler",
  entry: "./handler.ts",
  timeoutSeconds: 10,
  resourceGroupName: "data",
});
