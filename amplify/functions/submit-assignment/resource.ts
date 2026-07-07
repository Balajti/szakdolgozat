import { defineFunction } from '@aws-amplify/backend';

export const submitAssignment = defineFunction({
  name: 'submit-assignment',
  resourceGroupName: 'data',
  timeoutSeconds: 30, // grading + profile lookup by email (scan) exceeds the 3s default
});
