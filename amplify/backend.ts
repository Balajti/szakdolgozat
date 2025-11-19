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

// Add table name environment variables to all functions
functions.forEach((fn) => {
  fn.addEnvironment('AMPLIFY_DATA_STUDENTPROFILE_TABLE_NAME', backend.data.resources.tables['StudentProfile'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_TEACHERPROFILE_TABLE_NAME', backend.data.resources.tables['TeacherProfile'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_WORD_TABLE_NAME', backend.data.resources.tables['Word'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_STORY_TABLE_NAME', backend.data.resources.tables['Story'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_ACHIEVEMENT_TABLE_NAME', backend.data.resources.tables['Achievement'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_ASSIGNMENT_TABLE_NAME', backend.data.resources.tables['Assignment'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_SUBMISSIONSUMMARY_TABLE_NAME', backend.data.resources.tables['SubmissionSummary'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_CLASSSUMMARY_TABLE_NAME', backend.data.resources.tables['ClassSummary'].tableName);
  
  // Grant DynamoDB permissions to all functions
  fn.resources.lambda.addToRolePolicy(
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
        backend.data.resources.tables['TeacherProfile'].tableArn,
        backend.data.resources.tables['Word'].tableArn,
        backend.data.resources.tables['Story'].tableArn,
        backend.data.resources.tables['Achievement'].tableArn,
        backend.data.resources.tables['Assignment'].tableArn,
        backend.data.resources.tables['SubmissionSummary'].tableArn,
        backend.data.resources.tables['ClassSummary'].tableArn,
        `${backend.data.resources.tables['StudentProfile'].tableArn}/index/*`,
        `${backend.data.resources.tables['TeacherProfile'].tableArn}/index/*`,
        `${backend.data.resources.tables['Word'].tableArn}/index/*`,
        `${backend.data.resources.tables['Story'].tableArn}/index/*`,
        `${backend.data.resources.tables['Achievement'].tableArn}/index/*`,
        `${backend.data.resources.tables['Assignment'].tableArn}/index/*`,
        `${backend.data.resources.tables['SubmissionSummary'].tableArn}/index/*`,
        `${backend.data.resources.tables['ClassSummary'].tableArn}/index/*`,
      ],
    })
  );
});
