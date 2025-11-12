export type UserRole = "student" | "teacher" | "parent";

export interface Word {
  id: string;
  text: string;
  translation: string;
  exampleSentence?: string;
  mastery: "known" | "learning" | "unknown";
  lastReviewedAt?: string;
}

export interface Story {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  level: string;
  unknownWordIds: string[];
  highlightedWords?: Array<{
    word: string;
    offset: number;
    length: number;
  }>;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  birthday: string;
  avatarUrl?: string;
  level: string;
  streak: number;
  vocabularyCount: number;
  achievements: Achievement[];
  words: Word[];
  stories: Story[];
}

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  school?: string;
  classes: ClassSummary[];
}

export interface ClassSummary {
  id: string;
  name: string;
  studentCount: number;
  averageLevel: string;
  completionRate: number;
  mostChallengingWord?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  achievedAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  level: string;
  status: "draft" | "sent" | "submitted" | "graded";
  requiredWords?: string[];
  excludedWords?: string[];
  submissions?: SubmissionSummary[];
}

export interface SubmissionSummary {
  studentId: string;
  studentName: string;
  submittedAt: string;
  score?: number;
  unknownWords: string[];
}

export interface StoryGenerationRequest {
  level: string;
  age: number;
  knownWords: string[];
  unknownWords: string[];
  requiredWords?: string[];
  excludedWords?: string[];
  mode: "placement" | "personalized" | "teacher";
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
