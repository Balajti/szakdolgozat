import { defineFunction } from '@aws-amplify/backend';

export const distributeAssignment = defineFunction({
  name: 'distribute-assignment',
  resourceGroupName: 'data'
});
