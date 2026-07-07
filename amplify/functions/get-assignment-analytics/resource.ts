import { defineFunction } from '@aws-amplify/backend';

export const getAssignmentAnalytics = defineFunction({
  name: 'get-assignment-analytics',
  resourceGroupName: 'data',
  timeoutSeconds: 30, // aggregates several queries; 3s default is too tight on cold starts
});
