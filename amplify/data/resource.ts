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
  Word: a
    .model({
      studentId: a.id().required(),
      text: a.string().required(),
      translation: a.string().required(),
      exampleSentence: a.string(),
      mastery: a.ref('WordMastery'),
      lastReviewedAt: a.datetime(),
      studentProfile: a.belongsTo('StudentProfile', 'studentId'),
    })
    .secondaryIndexes((index) => [
      index('studentId').name('byStudentId').queryField('listWordsByStudent'),
    ])
    .authorization((allow) => [allow.authenticated()]),
  Story: a
    .model({
      studentId: a.id(),
      teacherId: a.id(),
      title: a.string().required(),
      content: a.string().required(),
      level: a.string().required(),
      mode: a.ref('StoryGenerationMode'),
      unknownWordIds: a.string().array(),
      highlightedWords: a.json(),
      studentProfile: a.belongsTo('StudentProfile', 'studentId'),
      teacherProfile: a.belongsTo('TeacherProfile', 'teacherId'),
    })
    .secondaryIndexes((index) => [
      index('studentId').name('byStudentId').queryField('listStoriesByStudent'),
    ])
    .authorization((allow) => [allow.authenticated()]),
  Achievement: a
    .model({
      studentId: a.id().required(),
      title: a.string().required(),
      description: a.string().required(),
      icon: a.string().required(),
      achievedAt: a.date().required(),
      studentProfile: a.belongsTo('StudentProfile', 'studentId'),
    })
    .secondaryIndexes((index) => [
      index('studentId').name('byStudentId').queryField('listAchievementsByStudent'),
    ])
    .authorization((allow) => [allow.authenticated()]),
  Assignment: a
    .model({
      teacherId: a.id().required(),
      title: a.string().required(),
      dueDate: a.date().required(),
      level: a.string().required(),
      status: a.ref('AssignmentStatus'),
      requiredWords: a.string().array(),
      excludedWords: a.string().array(),
      teacherProfile: a.belongsTo('TeacherProfile', 'teacherId'),
    })
    .secondaryIndexes((index) => [
      index('teacherId').name('byTeacherId').queryField('listAssignmentsByTeacher'),
    ])
    .authorization((allow) => [allow.authenticated()]),
  SubmissionSummary: a
    .model({
      assignmentId: a.id().required(),
      teacherId: a.id().required(),
      studentId: a.id().required(),
      studentName: a.string().required(),
      submittedAt: a.datetime().required(),
      score: a.integer(),
      unknownWords: a.string().array(),
      teacherProfile: a.belongsTo('TeacherProfile', 'teacherId'),
      studentProfile: a.belongsTo('StudentProfile', 'studentId'),
    })
    .secondaryIndexes((index) => [
      index('teacherId').name('byTeacherId').queryField('listSubmissionsByTeacher'),
    ])
    .authorization((allow) => [allow.authenticated()]),
  ClassSummary: a
    .model({
      teacherId: a.id().required(),
      name: a.string().required(),
      studentCount: a.integer().required(),
      averageLevel: a.string().required(),
      completionRate: a.float().required(),
      mostChallengingWord: a.string(),
      teacherProfile: a.belongsTo('TeacherProfile', 'teacherId'),
    })
    .secondaryIndexes((index) => [
      index('teacherId').name('byTeacherId').queryField('listClassesByTeacher'),
    ])
    .authorization((allow) => [allow.authenticated()]),
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
      submissions: a.hasMany('SubmissionSummary', 'studentId'),
    })
    .authorization((allow) => [allow.authenticated(),allow.publicApiKey(), allow.authenticated('identityPool')]),
  TeacherProfile: a
    .model({
      name: a.string().required(),
      email: a.email().required(),
      school: a.string(),
      classes: a.hasMany('ClassSummary', 'teacherId'),
      stories: a.hasMany('Story', 'teacherId'),
      assignments: a.hasMany('Assignment', 'teacherId'),
      submissions: a.hasMany('SubmissionSummary', 'teacherId'),
    })
    .authorization((allow) => [allow.authenticated(),allow.publicApiKey(), allow.authenticated('identityPool')]),
  StoryView: a.customType({
    id: a.id().required(),
    studentId: a.id(),
    teacherId: a.id(),
    title: a.string().required(),
    content: a.string().required(),
    level: a.string().required(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    mode: a.ref('StoryGenerationMode'),
    unknownWordIds: a.string().array(),
    highlightedWords: a.ref('HighlightedWord').array(),
  }),
  WordView: a.customType({
    id: a.id().required(),
    studentId: a.id().required(),
    text: a.string().required(),
    translation: a.string().required(),
    exampleSentence: a.string(),
    mastery: a.ref('WordMastery').required(),
    lastReviewedAt: a.datetime(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
  }),
  AchievementView: a.customType({
    id: a.id().required(),
    studentId: a.id().required(),
    title: a.string().required(),
    description: a.string().required(),
    icon: a.string().required(),
    achievedAt: a.date().required(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
  }),
  StudentProfileView: a.customType({
    id: a.id().required(),
    name: a.string().required(),
    email: a.email().required(),
    birthday: a.date(),
    avatarUrl: a.url(),
    level: a.string().required(),
    streak: a.integer().required(),
    vocabularyCount: a.integer().required(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    achievements: a.ref('AchievementView').array(),
    words: a.ref('WordView').array(),
    stories: a.ref('StoryView').array(),
  }),
  TeacherProfileView: a.customType({
    id: a.id().required(),
    name: a.string().required(),
    email: a.email().required(),
    school: a.string(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
  }),
  AssignmentView: a.customType({
    id: a.id().required(),
    teacherId: a.id().required(),
    title: a.string().required(),
    dueDate: a.date().required(),
    level: a.string().required(),
    status: a.ref('AssignmentStatus').required(),
    requiredWords: a.string().array(),
    excludedWords: a.string().array(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
  }),
  SubmissionSummaryView: a.customType({
    id: a.id().required(),
    assignmentId: a.id().required(),
    teacherId: a.id().required(),
    studentId: a.id().required(),
    studentName: a.string().required(),
    submittedAt: a.datetime().required(),
    score: a.integer(),
    unknownWords: a.string().array(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
  }),
  ClassSummaryView: a.customType({
    id: a.id().required(),
    teacherId: a.id().required(),
    name: a.string().required(),
    studentCount: a.integer().required(),
    averageLevel: a.string().required(),
    completionRate: a.float().required(),
    mostChallengingWord: a.string(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
  }),
  StoryConnection: a.customType({
    items: a.ref('StoryView').array(),
    nextToken: a.string(),
  }),
  StudentDashboardPayload: a.customType({
    profile: a.ref('StudentProfileView'),
    recommendations: a.ref('StoryView').array(),
  }),
  TeacherDashboardPayload: a.customType({
    profile: a.ref('TeacherProfileView'),
    assignments: a.ref('AssignmentView').array(),
    submissions: a.ref('SubmissionSummaryView').array(),
    classes: a.ref('ClassSummaryView').array(),
  }),
  StoryGenerationPayload: a.customType({
    story: a.ref('StoryView'),
    newWords: a.ref('WordView').array(),
  }),
  getStudentDashboard: a
    .query()
    .arguments({ id: a.id() })
    .returns(a.ref('StudentDashboardPayload'))
    .authorization((allow) => [allow.authenticated(),allow.publicApiKey(), allow.authenticated('identityPool')])
    .handler(a.handler.function(studentDashboard)),
  getTeacherDashboard: a
    .query()
    .arguments({ id: a.id() })
    .returns(a.ref('TeacherDashboardPayload'))
    .authorization((allow) => [allow.authenticated(),allow.publicApiKey(), allow.authenticated('identityPool')])
    .handler(a.handler.function(teacherDashboard)),
  listStudentStories: a
    .query()
    .arguments({
      studentId: a.id(),
      limit: a.integer(),
      nextToken: a.string(),
    })
    .returns(a.ref('StoryConnection'))
    .authorization((allow) => [allow.authenticated(),allow.publicApiKey(), allow.authenticated('identityPool')])
    .handler(a.handler.function(listStories)),
  listTeacherAssignments: a
    .query()
    .arguments({ teacherId: a.id() })
    .returns(a.ref('AssignmentView').array())
    .authorization((allow) => [allow.authenticated(), allow.authenticated('identityPool'), allow.publicApiKey()])
    .handler(a.handler.function(listAssignments)),
  generateStory: a
    .mutation()
    .arguments({
      level: a.string().required(),
      age: a.integer().required(),
      knownWords: a.string().array().required(),
      unknownWords: a.string().array().required(),
      requiredWords: a.string().array(),
      excludedWords: a.string().array(),
      mode: a.ref('StoryGenerationMode').required(),
    })
    .returns(a.ref('StoryGenerationPayload'))
    .authorization((allow) => [allow.authenticated(),allow.publicApiKey(), allow.authenticated('identityPool')])
    .handler(a.handler.function(generateStory)),
  updateWordMastery: a
    .mutation()
    .arguments({
      studentId: a.id().required(),
      wordId: a.id().required(),
      mastery: a.ref('WordMastery').required(),
    })
    .returns(a.ref('Word'))
    .authorization((allow) => [allow.authenticated(),allow.publicApiKey(), allow.authenticated('identityPool')])
    .handler(a.handler.function(updateWordMastery)),
  createTeacherAssignment: a
    .mutation()
    .arguments({
      teacherId: a.id().required(),
      title: a.string().required(),
      dueDate: a.date().required(),
      level: a.string().required(),
      requiredWords: a.string().array(),
      excludedWords: a.string().array(),
    })
    .returns(a.ref('Assignment'))
    .authorization((allow) => [allow.authenticated(),allow.publicApiKey(), allow.authenticated('identityPool')])
    .handler(a.handler.function(createAssignment)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});
