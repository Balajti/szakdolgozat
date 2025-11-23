export type UserRole = "student" | "teacher" | "parent";

export type WordMastery = "known" | "learning" | "unknown";
export type AssignmentStatus = "draft" | "sent" | "submitted" | "graded";
export type StoryGenerationMode = "placement" | "personalized" | "teacher";

export interface HighlightedWord {
  word: string;
  offset: number;
  length: number;
}

export interface Word {
  id: string;
  studentId: string;
  text: string;
  translation: string;
  exampleSentence?: string | null;
  mastery: WordMastery;
  lastReviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  id: string;
  studentId?: string | null;
  teacherId?: string | null;
  title: string;
  content: string;
  level: string;
  createdAt: string;
  updatedAt: string;
  mode?: StoryGenerationMode | null;
  unknownWordIds: string[];
  highlightedWords?: HighlightedWord[];
}

export interface Achievement {
  id: string;
  studentId: string;
  title: string;
  description: string;
  icon: string;
  achievedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  birthday?: string | null;
  avatarUrl?: string | null;
  level: string;
  streak: number;
  vocabularyCount: number;
  achievements: Achievement[];
  words: Word[];
  stories: Story[];
  createdAt: string;
  updatedAt: string;
}

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  school?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSummary {
  id: string;
  teacherId: string;
  name: string;
  studentCount: number;
  averageLevel: string;
  completionRate: number;
  mostChallengingWord?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  teacherId: string;
  title: string;
  dueDate: string;
  level: string;
  status: AssignmentStatus;
  requiredWords: string[];
  excludedWords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionSummary {
  id: string;
  assignmentId: string;
  teacherId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  score?: number | null;
  unknownWords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StoryGenerationRequest {
  level: string;
  age: number;
  knownWords: string[];
  unknownWords: string[];
  requiredWords?: string[];
  excludedWords?: string[];
  mode: StoryGenerationMode;
}

export interface StoryGenerationResponse {
  story: Story;
  newWords: Word[];
}

export interface DictionaryLookupResponse {
  word: string;
  translation: string;
  exampleSentence: string;
  source: "glosbe" | "dictionaryapi" | "fallback";
}
