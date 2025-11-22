import { defineFunction } from '@aws-amplify/backend';

export const generateQuiz = defineFunction({
  name: 'generate-quiz',
  entry: './handler.ts',
  timeoutSeconds: 30,
  resourceGroupName: 'data',
  environment: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  },
});
