import { defineFunction } from '@aws-amplify/backend';

export const cleanupOldStories = defineFunction({
  name: 'cleanup-old-stories',
  entry: './handler.ts',
  timeoutSeconds: 60,
});
