import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { createAssignment } from './functions/create-assignment/resource';
import { generateStory } from './functions/generate-story/resource';
import { listAssignments } from './functions/list-assignments/resource';
import { listStories } from './functions/list-stories/resource';
import { studentDashboard } from './functions/student-dashboard/resource';
import { teacherDashboard } from './functions/teacher-dashboard/resource';
import { updateWordMastery } from './functions/update-word-mastery/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
export const backend = defineBackend({
  auth,
  data,
  studentDashboard,
  teacherDashboard,
  listStories,
  listAssignments,
  generateStory,
  updateWordMastery,
  createAssignment,
});

const functions = [
  backend.studentDashboard,
  backend.teacherDashboard,
  backend.listStories,
  backend.listAssignments,
  backend.generateStory,
  backend.updateWordMastery,
  backend.createAssignment,
];

functions.forEach((fn) => {
  backend.data.resources.graphqlApi.grantQuery(fn.resources.lambda);
  backend.data.resources.graphqlApi.grantMutation(fn.resources.lambda);
});

backend.studentDashboard.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:UpdateItem',
      'dynamodb:Query',
      'dynamodb:Scan',
    ],
    resources: [
      backend.data.resources.tables['StudentProfile'].tableArn,
      backend.data.resources.tables['Word'].tableArn,
      backend.data.resources.tables['Story'].tableArn,
      backend.data.resources.tables['Achievement'].tableArn,
      `${backend.data.resources.tables['StudentProfile'].tableArn}/index/*`,
      `${backend.data.resources.tables['Word'].tableArn}/index/*`,
      `${backend.data.resources.tables['Story'].tableArn}/index/*`,
      `${backend.data.resources.tables['Achievement'].tableArn}/index/*`,
    ],
  })
);
