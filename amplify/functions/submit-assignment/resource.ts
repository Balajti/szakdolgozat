import { defineFunction } from '@aws-amplify/backend';

export const submitAssignment = defineFunction({
  name: 'submit-assignment',
  resourceGroupName: 'data'
});
