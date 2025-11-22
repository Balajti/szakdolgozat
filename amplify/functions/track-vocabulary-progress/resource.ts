import { defineFunction } from '@aws-amplify/backend';

export const trackVocabularyProgress = defineFunction({
  name: 'track-vocabulary-progress',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
});
