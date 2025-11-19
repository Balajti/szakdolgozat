import { defineFunction } from "@aws-amplify/backend";

export const teacherDashboard = defineFunction({
  name: "teacher-dashboard-handler",
  entry: "./handler.ts",
  timeoutSeconds: 10,
  resourceGroupName: "data",
});
