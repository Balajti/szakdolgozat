import { defineFunction } from '@aws-amplify/backend';

export const distributeAssignment = defineFunction({
  name: 'distribute-assignment',
  resourceGroupName: 'data',
  timeoutSeconds: 30, // sends an email per student; the 3s default times out on a whole class
  environment: {
    // Set FROM_EMAIL and APP_URL under Amplify Hosting -> Environment variables.
    // FROM_EMAIL must be an SES-verified identity; APP_URL is the deployed app
    // origin used for assignment links in emails (e.g. https://main.xxxx.amplifyapp.com).
    FROM_EMAIL: process.env.FROM_EMAIL ?? '',
    BASE_URL: process.env.APP_URL ?? '',
  },
});
