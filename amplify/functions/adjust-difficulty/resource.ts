import { defineFunction, secret } from '@aws-amplify/backend';

export const adjustDifficulty = defineFunction({
  name: 'adjust-difficulty',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
  environment: {
    GEMINI_API_KEY: secret('GEMINI_API_KEY'),
  },
});
