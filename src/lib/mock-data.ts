import { format } from "date-fns";
import { hu } from "date-fns/locale";
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

export const mockWords: Word[] = [
  {
    id: uuid(),
    text: "discover",
    translation: "felfedez",
    exampleSentence: "Lily loves to discover new animal friends.",
    mastery: "learning",
    lastReviewedAt: format(now, "yyyy-MM-dd'T'HH:mm:ssXXX"),
  },
  {
    id: uuid(),
    text: "feather",
    translation: "toll",
    exampleSentence: "The owl dropped a golden feather.",
    mastery: "unknown",
  },
  {
    id: uuid(),
    text: "brave",
    translation: "bátor",
    exampleSentence: "He felt brave enough to speak English in class.",
    mastery: "known",
    lastReviewedAt: format(now, "yyyy-MM-dd'T'HH:mm:ssXXX"),
  },
];

export const mockStories: Story[] = [
  {
    id: uuid(),
    title: "The Midnight Library",
    content:
      "Mira tiptoed into the midnight library. Tiny fireflies lit the shelves. A soft voice welcomed her: 'Choose a book, brave reader.' Mira opened a glowing story about kind robots and curious owls.",
    createdAt: format(now, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    level: "A2",
    unknownWordIds: mockWords.filter((w) => w.mastery !== "known").map((w) => w.id),
  },
];

export const mockAchievements: Achievement[] = [
  {
    id: uuid(),
    title: "Első történet",
    description: "Elolvastad az első WordNest történeted!",
    icon: "🌟",
    achievedAt: format(now, "yyyy-MM-dd", { locale: hu }),
  },
  {
    id: uuid(),
    title: "Szókincs hős",
    description: "10 új szót rögzítettél a gyűjteményedhez.",
    icon: "🧠",
    achievedAt: format(now, "yyyy-MM-dd", { locale: hu }),
  },
];

export const mockStudentProfile: StudentProfile = {
  id: uuid(),
  name: "Erdei Mira",
  email: "mira@wordnest.hu",
  birthday: "2015-03-12",
  level: "A2",
  streak: 5,
  vocabularyCount: 38,
  achievements: mockAchievements,
  words: mockWords,
  stories: mockStories,
};

export const mockClassSummaries: ClassSummary[] = [
  {
    id: uuid(),
    name: "5.a Angol klub",
    studentCount: 16,
    averageLevel: "A2",
    completionRate: 0.82,
    mostChallengingWord: "feather",
  },
  {
    id: uuid(),
    name: "6.b Nyelvi műhely",
    studentCount: 14,
    averageLevel: "B1",
    completionRate: 0.73,
    mostChallengingWord: "discover",
  },
];

export const mockAssignments: Assignment[] = [
  {
    id: uuid(),
    title: "Weather Wonders",
    dueDate: format(new Date().setDate(now.getDate() + 3), "yyyy-MM-dd"),
    level: "A2",
    status: "sent",
    requiredWords: ["rainy", "storm", "umbrella"],
    excludedWords: ["hurricane"],
  },
  {
    id: uuid(),
    title: "Future Dream Jobs",
    dueDate: format(new Date().setDate(now.getDate() + 7), "yyyy-MM-dd"),
    level: "B1",
    status: "draft",
  },
];

export const mockSubmissions: SubmissionSummary[] = [
  {
    studentId: uuid(),
    studentName: "Kiss Dorka",
    submittedAt: format(now, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    score: 92,
    unknownWords: ["invent", "creative"],
  },
  {
    studentId: uuid(),
    studentName: "Szabó Levente",
    submittedAt: format(now, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    score: 78,
    unknownWords: ["courage", "feather"],
  },
];

export const mockTeacherProfile: TeacherProfile = {
  id: uuid(),
  name: "Farkas Anna",
  email: "anna@wordnest.hu",
  school: "Budai Általános Iskola",
  classes: mockClassSummaries,
};
