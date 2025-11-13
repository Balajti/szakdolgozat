import { format } from "date-fns";
import { v4 as uuid } from "uuid";

import type {
  Achievement,
  Assignment,
  ClassSummary,
  StudentProfile,
  Story,
  SubmissionSummary,
  TeacherProfile,
  Word,
} from "@/lib/types";

const now = new Date();

const isoDate = (date: Date | number) => format(date, "yyyy-MM-dd");
const isoDateTime = (date: Date | number) => format(date, "yyyy-MM-dd'T'HH:mm:ssXXX");

const mockStudentId = uuid();
const mockTeacherId = uuid();

const assignmentPrimaryId = uuid();
const assignmentSecondaryId = uuid();

const classPrimaryId = uuid();
const classSecondaryId = uuid();

const baseCreatedAt = isoDateTime(now);

export const mockWords: Word[] = [
  {
    id: uuid(),
  studentId: mockStudentId,
  text: "discover",
  translation: "felfedez",
  mastery: "learning",
  lastReviewedAt: isoDateTime(now),
  createdAt: baseCreatedAt,
    updatedAt: baseCreatedAt,
  },
  {
  id: uuid(),
  studentId: mockStudentId,
  text: "feather",
  translation: "toll",
  exampleSentence: "The owl dropped a golden feather.",
  mastery: "unknown",
  lastReviewedAt: null,
  createdAt: baseCreatedAt,
  updatedAt: baseCreatedAt,
  },
  {
    id: uuid(),
  studentId: mockStudentId,
  text: "brave",
  translation: "bátor",
  exampleSentence: "He felt brave enough to speak English in class.",
  mastery: "known",
  lastReviewedAt: isoDateTime(now),
    createdAt: baseCreatedAt,
    updatedAt: baseCreatedAt,
  },
];

export const mockStories: Story[] = [
  {
    id: uuid(),
    studentId: mockStudentId,
  teacherId: mockTeacherId,
  title: "The Midnight Library",
  content:
      "Mira tiptoed into the midnight library. Tiny fireflies lit the shelves. A soft voice welcomed her: 'Choose a book, brave reader.' Mira opened a glowing story about kind robots and curious owls.",
    level: "A2",
    createdAt: baseCreatedAt,
  updatedAt: baseCreatedAt,
  mode: "personalized",
  unknownWordIds: mockWords.filter((w) => w.mastery !== "known").map((w) => w.id),
    highlightedWords: [],
  },
];

export const mockAchievements: Achievement[] = [
  {
    id: uuid(),
  studentId: mockStudentId,
  title: "Első történet",
  description: "Elolvastad az első WordNest történeted!",
  icon: "🌟",
  achievedAt: isoDate(now),
  createdAt: baseCreatedAt,
    updatedAt: baseCreatedAt,
  },
  {
  id: uuid(),
  studentId: mockStudentId,
  title: "Szókincs hős",
  description: "10 új szót rögzítettél a gyűjteményedhez.",
  icon: "🧠",
  achievedAt: isoDate(now),
    createdAt: baseCreatedAt,
    updatedAt: baseCreatedAt,
  },
];

export const mockStudentProfile: StudentProfile = {
  id: mockStudentId,
  name: "Erdei Mira",
  email: "mira@wordnest.hu",
  birthday: "2015-03-12",
  avatarUrl: null,
  level: "A2",
  streak: 5,
  vocabularyCount: mockWords.filter((word) => word.mastery !== "unknown").length,
  achievements: mockAchievements,
  words: mockWords,
  stories: mockStories,
  createdAt: baseCreatedAt,
  updatedAt: baseCreatedAt,
};

export const mockClassSummaries: ClassSummary[] = [
  {
    id: classPrimaryId,
    teacherId: mockTeacherId,
  name: "5.a Angol klub",
  studentCount: 16,
  averageLevel: "A2",
  completionRate: 0.82,
  mostChallengingWord: "feather",
  createdAt: baseCreatedAt,
    updatedAt: baseCreatedAt,
  },
  {
  id: classSecondaryId,
  teacherId: mockTeacherId,
  name: "6.b Nyelvi műhely",
  studentCount: 14,
  averageLevel: "B1",
  completionRate: 0.73,
  mostChallengingWord: "discover",
  createdAt: baseCreatedAt,
  updatedAt: baseCreatedAt,
  },
];

export const mockAssignments: Assignment[] = [
  {
    id: assignmentPrimaryId,
    teacherId: mockTeacherId,
  title: "Weather Wonders",
  dueDate: isoDate(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)),
  level: "A2",
  status: "sent",
  requiredWords: ["rainy", "storm", "umbrella"],
  excludedWords: ["hurricane"],
    createdAt: baseCreatedAt,
    updatedAt: baseCreatedAt,
  },
  {
    id: assignmentSecondaryId,
    teacherId: mockTeacherId,
    title: "Future Dream Jobs",
  dueDate: isoDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
  level: "B1",
  status: "draft",
  requiredWords: [],
  excludedWords: [],
  createdAt: baseCreatedAt,
    updatedAt: baseCreatedAt,
  },
];

export const mockSubmissions: SubmissionSummary[] = [
  {
    id: uuid(),
    assignmentId: assignmentPrimaryId,
  teacherId: mockTeacherId,
  studentId: uuid(),
  studentName: "Kiss Dorka",
  submittedAt: isoDateTime(now),
  score: 92,
  unknownWords: ["invent", "creative"],
    createdAt: baseCreatedAt,
    updatedAt: baseCreatedAt,
  },
  {
    id: uuid(),
    assignmentId: assignmentPrimaryId,
  teacherId: mockTeacherId,
  studentId: uuid(),
  studentName: "Szabó Levente",
  submittedAt: isoDateTime(now),
  score: 78,
  unknownWords: ["courage", "feather"],
    createdAt: baseCreatedAt,
    updatedAt: baseCreatedAt,
  },
];

export const mockTeacherProfile: TeacherProfile = {
  id: mockTeacherId,
  name: "Farkas Anna",
  email: "anna@wordnest.hu",
  school: "Budai Általános Iskola",
  createdAt: baseCreatedAt,
  updatedAt: baseCreatedAt,
};

export const mockRecommendations: Story[] = mockStories;
