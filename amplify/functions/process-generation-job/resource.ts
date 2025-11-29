import { defineFunction } from '@aws-amplify/backend';

export const processGenerationJob = defineFunction({
    name: 'process-generation-job',
    resourceGroupName: 'data',
    timeoutSeconds: 300, // 5 minutes for AI generation
    environment: {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    }
});
