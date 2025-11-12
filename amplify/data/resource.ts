import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

import { createAssignment } from '../functions/create-assignment/resource';
import { generateStory } from '../functions/generate-story/resource';
import { listAssignments } from '../functions/list-assignments/resource';
import { listStories } from '../functions/list-stories/resource';
import { studentDashboard } from '../functions/student-dashboard/resource';
import { teacherDashboard } from '../functions/teacher-dashboard/resource';
import { updateWordMastery } from '../functions/update-word-mastery/resource';

const schema = a.schema({
  WordMastery: a.enum(['known', 'learning', 'unknown']),
  AssignmentStatus: a.enum(['draft', 'sent', 'submitted', 'graded']),
  StoryGenerationMode: a.enum(['placement', 'personalized', 'teacher']),
  HighlightedWord: a.customType({
    word: a.string(),
    offset: a.integer(),
    length: a.integer(),
  }),
  Story: a
    .model({
      title: a.string().required(),
      content: a.string().required(),
      level: a.string().required(),
      createdAt: a.datetime().required(),
      studentId: a.id(),
      teacherId: a.id(),
      unknownWordIds: a.string().array(),
      highlightedWords: a.ref('HighlightedWord').array(),
      mode: a.ref('StoryGenerationMode'),
    })
    .authorization((allow) => [allow.authenticated()])
    .secondaryIndexes((index) => [
      index('studentId').sortKeys(['createdAt']),
      index('teacherId').sortKeys(['createdAt']),
    ]),
  Word: a
    .model({
      studentId: a.id().required(),
      student: a.belongsTo('StudentProfile', 'studentId'),
      text: a.string().required(),
      translation: a.string().required(),
      exampleSentence: a.string(),
      mastery: a.ref('WordMastery').required(),
      lastReviewedAt: a.datetime(),
    })
    .authorization((allow) => [allow.authenticated()])
    .secondaryIndexes((index) => [index('studentId')]),
  Achievement: a
    .model({
      studentId: a.id().required(),
      title: a.string().required(),
      description: a.string().required(),
      icon: a.string().required(),
      achievedAt: a.date().required(),
    })
    .authorization((allow) => [allow.authenticated()])
    .secondaryIndexes((index) => [index('studentId')]),
  StudentProfile: a
    .model({
      name: a.string().required(),
      email: a.email().required(),
      birthday: a.date(),
      avatarUrl: a.url(),
      level: a.string().required(),
      streak: a.integer().required(),
      vocabularyCount: a.integer().required(),
      words: a.hasMany('Word', 'studentId'),
      stories: a.hasMany('Story', 'studentId'),
      achievements: a.hasMany('Achievement', 'studentId'),
    })
    .authorization((allow) => [allow.authenticated()]),
  TeacherProfile: a
    .model({
      name: a.string().required(),
      email: a.email().required(),
      school: a.string(),
      classes: a.hasMany('ClassSummary', 'teacherId'),
    })
    .authorization((allow) => [allow.authenticated()]),
  ClassSummary: a
    .model({
      teacherId: a.id().required(),
      name: a.string().required(),
      studentCount: a.integer().required(),
      averageLevel: a.string().required(),
      completionRate: a.float().required(),
      mostChallengingWord: a.string(),
    })
    .authorization((allow) => [allow.authenticated()])
    .secondaryIndexes((index) => [index('teacherId')]),
  Assignment: a
    .model({
      teacherId: a.id().required(),
      title: a.string().required(),
      dueDate: a.date().required(),
      level: a.string().required(),
      status: a.ref('AssignmentStatus').required(),
      requiredWords: a.string().array(),
      excludedWords: a.string().array(),
      createdAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.authenticated()])
    .secondaryIndexes((index) => [
      index('teacherId').sortKeys(['dueDate']),
    ]),
  SubmissionSummary: a
    .model({
      assignmentId: a.id().required(),
      teacherId: a.id().required(),
      studentId: a.id().required(),
      studentName: a.string().required(),
      submittedAt: a.datetime().required(),
      score: a.integer(),
      unknownWords: a.string().array().required(),
    })
    .authorization((allow) => [allow.authenticated()])
    .secondaryIndexes((index) => [
      index('teacherId').sortKeys(['assignmentId']),
      index('assignmentId').sortKeys(['submittedAt']),
    ]),
  StoryConnection: a.customType({
    items: a.ref('Story').array(),
    nextToken: a.string(),
  }),
  StudentDashboardPayload: a.customType({
    profile: a.ref('StudentProfile'),
    recommendations: a.ref('Story').array(),
  }),
  TeacherDashboardPayload: a.customType({
    profile: a.ref('TeacherProfile'),
    assignments: a.ref('Assignment').array(),
    submissions: a.ref('SubmissionSummary').array(),
    classes: a.ref('ClassSummary').array(),
  }),
  StoryGenerationInput: a.customType({
    level: a.string(),
    age: a.integer(),
    knownWords: a.string().array(),
    unknownWords: a.string().array(),
    requiredWords: a.string().array(),
    excludedWords: a.string().array(),
    mode: a.ref('StoryGenerationMode'),
  }),
  UpdateWordMasteryInput: a.customType({
    studentId: a.id(),
    wordId: a.id(),
    mastery: a.ref('WordMastery'),
  }),
  CreateAssignmentInput: a.customType({
    teacherId: a.id(),
    title: a.string(),
    dueDate: a.date(),
    level: a.string(),
    requiredWords: a.string().array(),
    excludedWords: a.string().array(),
  }),
  StoryGenerationPayload: a.customType({
    story: a.ref('Story'),
    newWords: a.ref('Word').array(),
  }),
  getStudentDashboard: a
    .query()
    .arguments({ id: a.id() })
    .returns(a.ref('StudentDashboardPayload'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(studentDashboard)),
  getTeacherDashboard: a
    .query()
    .arguments({ id: a.id() })
    .returns(a.ref('TeacherDashboardPayload'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(teacherDashboard)),
  listStories: a
    .query()
    .arguments({
      studentId: a.id(),
      limit: a.integer(),
      nextToken: a.string(),
    })
    .returns(a.ref('StoryConnection'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(listStories)),
  listAssignments: a
    .query()
    .arguments({ teacherId: a.id() })
    .returns(a.ref('Assignment').array())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(listAssignments)),
  generateStory: a
    .mutation()
    .arguments({ input: a.ref('StoryGenerationInput') })
    .returns(a.ref('StoryGenerationPayload'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(generateStory)),
  updateWordMastery: a
    .mutation()
    .arguments({ input: a.ref('UpdateWordMasteryInput') })
    .returns(a.ref('Word'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(updateWordMastery)),
  createAssignment: a
    .mutation()
    .arguments({ input: a.ref('CreateAssignmentInput') })
    .returns(a.ref('Assignment'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(createAssignment)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
  functions: {
    getStudentDashboard: studentDashboard,
    getTeacherDashboard: teacherDashboard,
    listStories,
    listAssignments,
    generateStory,
    updateWordMastery,
    createAssignment,
  },
});
