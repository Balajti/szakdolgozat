import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { translateWord } from '../functions/translate-word/resource';
import { studentDashboard } from '../functions/student-dashboard/resource';
import { teacherDashboard } from '../functions/teacher-dashboard/resource';
import { listStories } from '../functions/list-stories/resource';
import { listAssignments } from '../functions/list-assignments/resource';
import { getAssignmentAnalytics } from '../functions/get-assignment-analytics/resource';
import { generateStory } from '../functions/generate-story/resource';
import { updateWordMastery } from '../functions/update-word-mastery/resource';
import { createAssignment } from '../functions/create-assignment/resource';
import { generateTeacherAssignment } from '../functions/generate-teacher-assignment/resource';
import { distributeAssignment } from '../functions/distribute-assignment/resource';
import { submitAssignment } from '../functions/submit-assignment/resource';
import { generateQuiz } from '../functions/generate-quiz/resource';
import { checkBadges } from '../functions/check-badges/resource';
import { adjustDifficulty } from '../functions/adjust-difficulty/resource';
import { trackVocabularyProgress } from '../functions/track-vocabulary-progress/resource';
import { cleanupOldStories } from '../functions/cleanup-old-stories/resource';

const schema = a.schema({
  WordMastery: a.enum(['known', 'learning', 'unknown']),
  AssignmentStatus: a.enum(['draft', 'sent', 'submitted', 'graded']),
  StoryGenerationMode: a.enum(['placement', 'personalized', 'teacher']),
  AssignmentType: a.enum(['basic', 'fill_blanks', 'word_matching', 'custom_words']),
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
      exampleTranslation: a.string(),
      partOfSpeech: a.string(),
      pastTense: a.string(),
      futureTense: a.string(),
      pluralForm: a.string(),
      usageNotes: a.string(),
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
      difficulty: a.string(),
      topic: a.string(),
      readCount: a.integer(),
      mode: a.ref('StoryGenerationMode'),
      unknownWordIds: a.string().array(),
      highlightedWords: a.json(),
      blankPositions: a.json(),
      studentProfile: a.belongsTo('StudentProfile', 'studentId'),
      teacherProfile: a.belongsTo('TeacherProfile', 'teacherId'),
    })
    .secondaryIndexes((index) => [
      index('studentId').name('byStudentId').queryField('listStoriesByStudent'),
    ])
    .authorization((allow) => [allow.authenticated()]),
  Badge: a
    .model({
      studentId: a.id().required(),
      type: a.string().required(),
      title: a.string().required(),
      description: a.string().required(),
      icon: a.string().required(),
      progress: a.integer(),
      target: a.integer(),
      achievedAt: a.datetime(),
      isUnlocked: a.boolean().required(),
      studentProfile: a.belongsTo('StudentProfile', 'studentId'),
    })
    .secondaryIndexes((index) => [
      index('studentId').name('byStudentId').queryField('listBadgesByStudent'),
    ])
    .authorization((allow) => [allow.authenticated()]),
  QuizQuestion: a
    .model({
      storyId: a.id().required(),
      question: a.string().required(),
      options: a.string().array().required(),
      correctAnswer: a.string().required(),
      explanation: a.string(),
      difficulty: a.string(),
    })
    .secondaryIndexes((index) => [
      index('storyId').name('byStoryId').queryField('listQuestionsByStory'),
    ])
    .authorization((allow) => [allow.authenticated()]),
  VocabularyProgress: a
    .model({
      studentId: a.id().required(),
      date: a.date().required(),
      knownWords: a.integer().required(),
      learningWords: a.integer().required(),
      unknownWords: a.integer().required(),
      newWordsToday: a.integer().required(),
      studentProfile: a.belongsTo('StudentProfile', 'studentId'),
    })
    .secondaryIndexes((index) => [
      index('studentId').name('byStudentId').queryField('listProgressByStudent'),
    ])
    .authorization((allow) => [allow.authenticated()]),
  ClassGroup: a
    .model({
      teacherId: a.id().required(),
      name: a.string().required(),
      description: a.string(),
      studentIds: a.id().array(),
      color: a.string(),
      teacherProfile: a.belongsTo('TeacherProfile', 'teacherId'),
    })
    .secondaryIndexes((index) => [
      index('teacherId').name('byTeacherId').queryField('listGroupsByTeacher'),
    ])
    .authorization((allow) => [allow.authenticated()]),
  ClassInvite: a
    .model({
      teacherId: a.id().required(),
      classGroupId: a.id().required(),
      className: a.string().required(),
      inviteCode: a.string().required(),
      studentEmail: a.email(),
      status: a.string().required(), // 'pending', 'accepted', 'expired'
      expiresAt: a.datetime().required(),
      acceptedAt: a.datetime(),
      studentId: a.id(),
      teacherProfile: a.belongsTo('TeacherProfile', 'teacherId'),
    })
    .secondaryIndexes((index) => [
      index('teacherId').name('byTeacherId').queryField('listInvitesByTeacher'),
      index('inviteCode').name('byInviteCode').queryField('getInviteByCode'),
    ])
    .authorization((allow) => [allow.authenticated(), allow.publicApiKey()]),
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
      assignmentType: a.ref('AssignmentType'),
      requiredWords: a.string().array(),
      excludedWords: a.string().array(),
      blankPositions: a.json(),
      matchingWords: a.string().array(),
      storyContent: a.string(),
      isTemplate: a.boolean(),
      originalAssignmentId: a.id(),
      usageCount: a.integer(),
      classGroupId: a.id(),
      classGroupName: a.string(),
      sentTo: a.string().array(), // Array of student emails who received this
      teacherProfile: a.belongsTo('TeacherProfile', 'teacherId'),
    })
    .secondaryIndexes((index) => [
      index('teacherId').name('byTeacherId').queryField('listAssignmentsByTeacher'),
      index('classGroupId').name('byClassGroupId').queryField('listAssignmentsByClass'),
    ])
    .authorization((allow) => [allow.authenticated()]),
  AssignmentSubmission: a
    .model({
      assignmentId: a.id().required(),
      studentId: a.id().required(),
      teacherId: a.id().required(),
      assignmentType: a.ref('AssignmentType').required(),
      answers: a.json().required(),
      score: a.integer().required(),
      maxScore: a.integer().required(),
      submittedAt: a.datetime().required(),
      feedback: a.string(),
      timeSpentSeconds: a.integer(),
      studentProfile: a.belongsTo('StudentProfile', 'studentId'),
      teacherProfile: a.belongsTo('TeacherProfile', 'teacherId'),
    })
    .secondaryIndexes((index) => [
      index('studentId').name('byStudentId').queryField('listSubmissionsByStudent'),
      index('assignmentId').name('byAssignmentId').queryField('listSubmissionsByAssignment'),
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
  StudentClass: a
    .model({
      studentId: a.id().required(),
      teacherId: a.id().required(),
      classId: a.id().required(),
      className: a.string().required(),
      joinedAt: a.datetime().required(),
      studentProfile: a.belongsTo('StudentProfile', 'studentId'),
      teacherProfile: a.belongsTo('TeacherProfile', 'teacherId'),
    })
    .secondaryIndexes((index) => [
      index('studentId').name('byStudentId').queryField('listClassesByStudent'),
      index('teacherId').name('byTeacherId').queryField('listStudentsByTeacher'),
    ])
    .authorization((allow) => [allow.authenticated()]),
  Notification: a
    .model({
      recipientId: a.id().required(),
      senderId: a.id().required(),
      senderName: a.string().required(),
      type: a.string().required(),
      title: a.string().required(),
      message: a.string().required(),
      assignmentId: a.id(),
      isRead: a.boolean().required(),
      createdAt: a.datetime().required(),
    })
    .secondaryIndexes((index) => [
      index('recipientId').name('byRecipientId').queryField('listNotificationsByRecipient'),
    ])
    .authorization((allow) => [allow.authenticated()]),
  StudentProfile: a
    .model({
      name: a.string().required(),
      email: a.email().required(),
      birthday: a.date(),
      avatarUrl: a.url(),
      level: a.string().required(),
      preferredLevel: a.string(),
      preferredAge: a.integer(),
      streak: a.integer().required(),
      vocabularyCount: a.integer().required(),
      preferredDifficulty: a.string(),
      preferredTopics: a.string().array(),
      useRandomTopics: a.boolean(),
      currentStreak: a.integer(),
      longestStreak: a.integer(),
      lastActiveDate: a.date(),
      totalStoriesRead: a.integer(),
      words: a.hasMany('Word', 'studentId'),
      stories: a.hasMany('Story', 'studentId'),
      achievements: a.hasMany('Achievement', 'studentId'),
      badges: a.hasMany('Badge', 'studentId'),
      vocabularyProgress: a.hasMany('VocabularyProgress', 'studentId'),
      assignmentSubmissions: a.hasMany('AssignmentSubmission', 'studentId'),
      studentClasses: a.hasMany('StudentClass', 'studentId'),
      submissions: a.hasMany('SubmissionSummary', 'studentId'),
    })
    .authorization((allow) => [allow.authenticated(),allow.publicApiKey(), allow.authenticated('identityPool')]),
  TeacherProfile: a
    .model({
      name: a.string().required(),
      email: a.email().required(),
      school: a.string(),
      bio: a.string(),
      avatarUrl: a.url(),
      preferredLevel: a.string(),
      preferredAge: a.integer(),
      classGroups: a.hasMany('ClassGroup', 'teacherId'),
      classes: a.hasMany('ClassSummary', 'teacherId'),
      stories: a.hasMany('Story', 'teacherId'),
      assignments: a.hasMany('Assignment', 'teacherId'),
      assignmentSubmissions: a.hasMany('AssignmentSubmission', 'teacherId'),
      studentClasses: a.hasMany('StudentClass', 'teacherId'),
      submissions: a.hasMany('SubmissionSummary', 'teacherId'),
      invites: a.hasMany('ClassInvite', 'teacherId'),
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
  WordTranslation: a.customType({
    word: a.string().required(),
    translation: a.string().required(),
    sourceLanguage: a.string().required(),
    targetLanguage: a.string().required(),
    exampleSentence: a.string(),
    exampleTranslation: a.string(),
    phonetic: a.string(),
    partOfSpeech: a.string(),
    pastTense: a.string(),
    futureTense: a.string(),
    pluralForm: a.string(),
    usageNotes: a.string(),
  }),
  translateWord: a
    .query()
    .arguments({
      word: a.string().required(),
      sourceLanguage: a.string(),
      targetLanguage: a.string().required(),
    })
    .returns(a.ref('WordTranslation'))
    .authorization((allow) => [allow.authenticated(), allow.publicApiKey()])
    .handler(a.handler.function(translateWord)),
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
  getAssignmentAnalytics: a
    .query()
    .arguments({
      assignmentId: a.id().required(),
      teacherId: a.id().required(),
    })
    .returns(
      a.customType({
        assignmentId: a.string().required(),
        totalSubmissions: a.integer().required(),
        completionRate: a.integer().required(),
        averageScore: a.integer().required(),
        passRate: a.integer().required(),
        averageTimeMinutes: a.integer().required(),
        strugglingStudentIds: a.string().array().required(),
        topPerformerIds: a.string().array().required(),
        mostChallengingWords: a.string().array().required(),
        excellentCount: a.integer().required(),
        goodCount: a.integer().required(),
        needsImprovementCount: a.integer().required(),
      })
    )
    .authorization((allow) => [allow.authenticated(),allow.publicApiKey(), allow.authenticated('identityPool')])
    .handler(a.handler.function(getAssignmentAnalytics)),
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
  generateTeacherAssignment: a
    .mutation()
    .arguments({
      teacherId: a.id().required(),
      title: a.string().required(),
      assignmentType: a.ref('AssignmentType').required(),
      level: a.string().required(),
      dueDate: a.date().required(),
      storyId: a.id(),
      wordsToRemove: a.string().array(),
      numberOfWords: a.integer(),
      customWords: a.string().array(),
    })
    .returns(
      a.customType({
        id: a.string().required(),
        teacherId: a.string().required(),
        title: a.string().required(),
        assignmentType: a.string().required(),
        dueDate: a.string().required(),
        level: a.string().required(),
        status: a.string().required(),
        storyContent: a.string(),
        requiredWords: a.string().array(),
        blankPositions: a.json(),
        matchingWords: a.string().array(),
        createdAt: a.string().required(),
      })
    )
    .authorization((allow) => [allow.authenticated(),allow.publicApiKey(), allow.authenticated('identityPool')])
    .handler(a.handler.function(generateTeacherAssignment)),
  distributeAssignment: a
    .mutation()
    .arguments({
      assignmentId: a.id().required(),
      teacherId: a.id().required(),
      studentIds: a.id().array(),
      classId: a.id(),
      sendToAll: a.boolean(),
    })
    .returns(
      a.customType({
        success: a.boolean().required(),
        assignmentId: a.string().required(),
        recipientCount: a.integer().required(),
        notificationIds: a.string().array(),
      })
    )
    .authorization((allow) => [allow.authenticated(),allow.publicApiKey(), allow.authenticated('identityPool')])
    .handler(a.handler.function(distributeAssignment)),
  submitAssignment: a
    .mutation()
    .arguments({
      assignmentId: a.id().required(),
      studentId: a.id().required(),
      answers: a.json().required(),
      timeSpentSeconds: a.integer(),
    })
    .returns(
      a.customType({
        id: a.string().required(),
        assignmentId: a.string().required(),
        studentId: a.string().required(),
        score: a.integer().required(),
        maxScore: a.integer().required(),
        percentage: a.integer().required(),
        feedback: a.string().required(),
        submittedAt: a.string().required(),
        passed: a.boolean().required(),
      })
    )
    .authorization((allow) => [allow.authenticated(),allow.publicApiKey(), allow.authenticated('identityPool')])
    .handler(a.handler.function(submitAssignment)),
  generateQuiz: a
    .mutation()
    .arguments({
      storyId: a.id().required(),
    })
    .returns(
      a.customType({
        quizId: a.string().required(),
        questions: a.json().required(),
      })
    )
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(generateQuiz)),
  checkBadges: a
    .mutation()
    .arguments({
      studentId: a.id().required(),
    })
    .returns(
      a.customType({
        newBadges: a.json().required(),
        allBadges: a.json().required(),
      })
    )
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(checkBadges)),
  adjustDifficulty: a
    .mutation()
    .arguments({
      text: a.string().required(),
      currentLevel: a.string().required(),
      targetLevel: a.string().required(),
    })
    .returns(
      a.customType({
        adjustedText: a.string().required(),
      })
    )
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(adjustDifficulty)),
  trackVocabularyProgress: a
    .mutation()
    .arguments({
      studentId: a.id().required(),
    })
    .returns(
      a.customType({
        date: a.string().required(),
        knownWords: a.integer().required(),
        learningWords: a.integer().required(),
        unknownWords: a.integer().required(),
        newWordsToday: a.integer().required(),
      })
    )
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(trackVocabularyProgress)),
  cleanupOldStories: a
    .mutation()
    .arguments({
      studentId: a.id().required(),
    })
    .returns(
      a.customType({
        deletedCount: a.integer().required(),
      })
    )
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(cleanupOldStories)),
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
  name: 'amplifyData',
});
