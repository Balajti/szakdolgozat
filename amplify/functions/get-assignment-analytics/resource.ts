import { defineFunction } from '@aws-amplify/backend';

export const getAssignmentAnalytics = defineFunction({
  name: 'get-assignment-analytics',
  resourceGroupName: 'data'
});
