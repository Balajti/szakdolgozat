import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { createAssignment } from './functions/create-assignment/resource';
import { distributeAssignment } from './functions/distribute-assignment/resource';
import { generateStory } from './functions/generate-story/resource';
import { getAssignmentAnalytics } from './functions/get-assignment-analytics/resource';
import { listAssignments } from './functions/list-assignments/resource';
import { listStories } from './functions/list-stories/resource';
import { submitAssignment } from './functions/submit-assignment/resource';
import { studentDashboard } from './functions/student-dashboard/resource';
import { teacherDashboard } from './functions/teacher-dashboard/resource';
import { updateWordMastery } from './functions/update-word-mastery/resource';
import { translateWord } from './functions/translate-word/resource';
import { generateTeacherAssignment } from './functions/generate-teacher-assignment/resource';
import { generateQuiz } from './functions/generate-quiz/resource';
import { checkBadges } from './functions/check-badges/resource';
import { adjustDifficulty } from './functions/adjust-difficulty/resource';
import { trackVocabularyProgress } from './functions/track-vocabulary-progress/resource';
import { cleanupOldStories } from './functions/cleanup-old-stories/resource';
import { postConfirmation } from './functions/post-confirmation/resource';
import { customMessage } from './functions/custom-message/resource';
import { processGenerationJob } from './functions/process-generation-job/resource';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { UserPoolOperation, UserPool } from 'aws-cdk-lib/aws-cognito';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { StartingPosition, FilterCriteria, FilterRule } from 'aws-cdk-lib/aws-lambda';
import { CfnTable, StreamViewType } from 'aws-cdk-lib/aws-dynamodb';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  studentDashboard,
  teacherDashboard,
  listStories,
  listAssignments,
  generateStory,
  updateWordMastery,
  createAssignment,
  translateWord,
  generateTeacherAssignment,
  distributeAssignment,
  submitAssignment,
  getAssignmentAnalytics,
  generateQuiz,
  checkBadges,
  adjustDifficulty,
  trackVocabularyProgress,
  cleanupOldStories,
  postConfirmation,
  customMessage,
  processGenerationJob
});

// ... (existing code) ...

// Connect custom-message Lambda as a Cognito trigger
// if (cfnUserPool) {
//   cfnUserPool.addPropertyOverride('LambdaConfig.CustomMessage',
//     backend.customMessage.resources.lambda.functionArn
//   );
// }

// Grant Cognito permission to invoke the custom message Lambda
// backend.customMessage.resources.lambda.addPermission('CognitoCustomMessageInvoke', {
//   principal: new ServicePrincipal('cognito-idp.amazonaws.com'),
//   sourceArn: backend.auth.resources.userPool.userPoolArn,
// });

const functions = [
  backend.studentDashboard,
  backend.teacherDashboard,
  backend.listStories,
  backend.listAssignments,
  backend.generateStory,
  backend.updateWordMastery,
  backend.createAssignment,
  backend.generateTeacherAssignment,
  backend.distributeAssignment,
  backend.submitAssignment,
  backend.getAssignmentAnalytics,
  backend.generateQuiz,
  backend.checkBadges,
  backend.adjustDifficulty,
  backend.trackVocabularyProgress,
  backend.cleanupOldStories,
  backend.processGenerationJob
];

// Add Gemini API key to AI-powered functions
backend.generateStory.addEnvironment('GEMINI_API_KEY', process.env.GEMINI_API_KEY || '');
backend.translateWord.addEnvironment('GEMINI_API_KEY', process.env.GEMINI_API_KEY || '');
backend.processGenerationJob.addEnvironment('GEMINI_API_KEY', process.env.GEMINI_API_KEY || '');

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
  fn.addEnvironment('AMPLIFY_DATA_STUDENTCLASS_TABLE_NAME', backend.data.resources.tables['StudentClass'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_NOTIFICATION_TABLE_NAME', backend.data.resources.tables['Notification'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_ASSIGNMENTSUBMISSION_TABLE_NAME', backend.data.resources.tables['AssignmentSubmission'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_BADGE_TABLE_NAME', backend.data.resources.tables['Badge'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_QUIZQUESTION_TABLE_NAME', backend.data.resources.tables['QuizQuestion'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_VOCABULARYPROGRESS_TABLE_NAME', backend.data.resources.tables['VocabularyProgress'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_CLASSGROUP_TABLE_NAME', backend.data.resources.tables['ClassGroup'].tableName);
  fn.addEnvironment('AMPLIFY_DATA_GENERATIONJOB_TABLE_NAME', backend.data.resources.tables['GenerationJob'].tableName);

  // Grant DynamoDB permissions to all functions
  fn.resources.lambda.addToRolePolicy(
    new PolicyStatement({
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
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
        backend.data.resources.tables['StudentClass'].tableArn,
        backend.data.resources.tables['Notification'].tableArn,
        backend.data.resources.tables['AssignmentSubmission'].tableArn,
        backend.data.resources.tables['Badge'].tableArn,
        backend.data.resources.tables['QuizQuestion'].tableArn,
        backend.data.resources.tables['VocabularyProgress'].tableArn,
        backend.data.resources.tables['ClassGroup'].tableArn,
        `${backend.data.resources.tables['StudentProfile'].tableArn}/index/*`,
        `${backend.data.resources.tables['TeacherProfile'].tableArn}/index/*`,
        `${backend.data.resources.tables['Word'].tableArn}/index/*`,
        `${backend.data.resources.tables['Story'].tableArn}/index/*`,
        `${backend.data.resources.tables['Achievement'].tableArn}/index/*`,
        `${backend.data.resources.tables['Assignment'].tableArn}/index/*`,
        `${backend.data.resources.tables['SubmissionSummary'].tableArn}/index/*`,
        `${backend.data.resources.tables['ClassSummary'].tableArn}/index/*`,
        `${backend.data.resources.tables['StudentClass'].tableArn}/index/*`,
        `${backend.data.resources.tables['Notification'].tableArn}/index/*`,
        `${backend.data.resources.tables['Badge'].tableArn}/index/*`,
        `${backend.data.resources.tables['QuizQuestion'].tableArn}/index/*`,
        `${backend.data.resources.tables['VocabularyProgress'].tableArn}/index/*`,
        `${backend.data.resources.tables['ClassGroup'].tableArn}/index/*`,
        `${backend.data.resources.tables['AssignmentSubmission'].tableArn}/index/*`,
        backend.data.resources.tables['GenerationJob'].tableArn,
        `${backend.data.resources.tables['GenerationJob'].tableArn}/index/*`,
      ],
    })
  );
});

// Enable DynamoDB Stream for GenerationJob table
const generationJobTable = backend.data.resources.tables['GenerationJob'] as unknown as CfnTable;
generationJobTable.streamSpecification = {
  streamViewType: StreamViewType.NEW_AND_OLD_IMAGES
};

// Connect GenerationJob table stream to processGenerationJob lambda
backend.processGenerationJob.resources.lambda.addEventSource(
  new DynamoEventSource(backend.data.resources.tables['GenerationJob'], {
    startingPosition: StartingPosition.LATEST,
    filters: [
      FilterCriteria.filter({
        eventName: FilterRule.isEqual('INSERT'),
      }),
    ],
  })
);

// Connect post-confirmation Lambda as a Cognito trigger
const cfnUserPool = backend.auth.resources.userPool.node.defaultChild as any;
if (cfnUserPool) {
  cfnUserPool.addPropertyOverride('LambdaConfig.PostConfirmation',
    backend.postConfirmation.resources.lambda.functionArn
  );
}

// Grant Cognito permission to invoke the Lambda
backend.postConfirmation.resources.lambda.addPermission('CognitoPostConfirmationInvoke', {
  principal: new ServicePrincipal('cognito-idp.amazonaws.com'),
  sourceArn: backend.auth.resources.userPool.userPoolArn,
});







// 4. Grant DynamoDB Permissions using Wildcard (Break IAM Dependency)
// We use a wildcard for the table name to avoid referencing the Table ARN directly
backend.postConfirmation.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: ['dynamodb:PutItem'],
    resources: ['arn:aws:dynamodb:*:*:table/*'],
  })
);



