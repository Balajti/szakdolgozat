import { defineFunction } from '@aws-amplify/backend';

export const publishResults = defineFunction({
    name: 'publish-results',
    entry: './handler.ts',
});
