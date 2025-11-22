import { defineFunction } from '@aws-amplify/backend';

export const checkBadges = defineFunction({
  name: 'check-badges',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
