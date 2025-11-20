import { defineFunction } from '@aws-amplify/backend';

export const generateTeacherAssignment = defineFunction({
  name: 'generate-teacher-assignment',
  resourceGroupName: 'data'
});
