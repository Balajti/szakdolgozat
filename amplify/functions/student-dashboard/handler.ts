import type { Schema } from "../../data/resource";
import { getDBClient, queryByIndex, type DynamoDBItem } from "../shared/dynamodb-client";

const DEFAULT_LEVEL = "A1";
const DEFAULT_STREAK = 0;

type StudentDashboardPayload = Schema["getStudentDashboard"]["returnType"];
type StoryView = Schema["StoryView"]["type"];
type StudentProfileView = Schema["StudentProfileView"]["type"];
type WordView = Schema["WordView"]["type"];
type AchievementView = Schema["AchievementView"]["type"];

function fallbackEmail(id: string): string {
  return `${id}@students.wordnest.local`;
}

export const handler: Schema["getStudentDashboard"]["functionHandler"] = async (event) => {
  const { id } = event.arguments;
  if (!id) {
    throw new Error("Student identifier is required");
  }

  const studentId = id as string;
  const db = getDBClient();

  // Get or create student profile
  let profileRecord = await db.get("StudentProfile", studentId);
  
  if (!profileRecord) {
    profileRecord = await db.put("StudentProfile", {
      id: studentId,
      name: "New Learner",
      email: fallbackEmail(studentId),
      level: DEFAULT_LEVEL,
      streak: DEFAULT_STREAK,
      vocabularyCount: 0,
    });
  }

  // Query words by studentId index
  const words = await queryByIndex("Word", "byStudentId", "studentId", studentId, 500);

  // Query stories by studentId index
  const stories = await queryByIndex("Story", "byStudentId", "studentId", studentId, 50);
  const sortedStories = stories.sort(
    (a, b) => Date.parse(String(b.createdAt)) - Date.parse(String(a.createdAt))
  );

  // Query achievements by studentId index
  const achievements = await queryByIndex("Achievement", "byStudentId", "studentId", studentId, 100);

  // Update vocabulary count
  const masteredWordCount = words.filter((word) => word.mastery !== "unknown").length;
  if (Number(profileRecord.vocabularyCount) !== masteredWordCount) {
    profileRecord = await db.update("StudentProfile", studentId, {
      vocabularyCount: masteredWordCount,
    });
  }

  const profileFallback = new Date().toISOString();

  const baseProfileView: Omit<StudentProfileView, 'achievements' | 'words' | 'stories'> = {
    id: String(profileRecord.id),
    name: String(profileRecord.name),
    email: String(profileRecord.email ?? fallbackEmail(studentId)),
    birthday: profileRecord.birthday ? String(profileRecord.birthday) : null,
    avatarUrl: profileRecord.avatarUrl ? String(profileRecord.avatarUrl) : null,
    level: String(profileRecord.level ?? DEFAULT_LEVEL),
    streak: Number(profileRecord.streak ?? DEFAULT_STREAK),
    vocabularyCount: masteredWordCount,
    createdAt: String(profileRecord.createdAt ?? profileFallback),
    updatedAt: String(profileRecord.updatedAt ?? profileRecord.createdAt ?? profileFallback),
  };

  const toStoryView = (story: DynamoDBItem): StoryView => {
    const fallbackTimestamp = new Date().toISOString();

    return {
      id: String(story.id),
      studentId: story.studentId ? String(story.studentId) : null,
      teacherId: story.teacherId ? String(story.teacherId) : null,
      title: String(story.title),
      content: String(story.content),
      level: String(story.level),
      createdAt: String(story.createdAt ?? fallbackTimestamp),
      updatedAt: String(story.updatedAt ?? story.createdAt ?? fallbackTimestamp),
      mode: story.mode ? (String(story.mode) as "placement" | "personalized" | "teacher") : null,
      unknownWordIds: Array.isArray(story.unknownWordIds) ? story.unknownWordIds.map(String) : [],
      highlightedWords: Array.isArray(story.highlightedWords) ? story.highlightedWords : [],
    };
  };

  const toWordView = (word: DynamoDBItem): WordView => {
    const fallbackTimestamp = new Date().toISOString();

    if (!word.studentId) {
      throw new Error("Word record is missing studentId");
    }

    return {
      id: String(word.id),
      studentId: String(word.studentId),
      text: String(word.text),
      translation: String(word.translation),
      exampleSentence: word.exampleSentence ? String(word.exampleSentence) : null,
      mastery: String(word.mastery) as "known" | "learning" | "unknown",
      lastReviewedAt: word.lastReviewedAt ? String(word.lastReviewedAt) : null,
      createdAt: String(word.createdAt ?? fallbackTimestamp),
      updatedAt: String(word.updatedAt ?? word.createdAt ?? fallbackTimestamp),
    };
  };

  const toAchievementView = (achievement: DynamoDBItem): AchievementView => {
    const fallbackTimestamp = new Date().toISOString();
    const fallbackDate = fallbackTimestamp.slice(0, 10);

    return {
      id: String(achievement.id),
      studentId: String(achievement.studentId),
      title: String(achievement.title),
      description: String(achievement.description),
      icon: String(achievement.icon),
      achievedAt: String(achievement.achievedAt ?? fallbackDate),
      createdAt: String(achievement.createdAt ?? fallbackTimestamp),
      updatedAt: String(achievement.updatedAt ?? achievement.createdAt ?? fallbackTimestamp),
    };
  };

  const wordViews = words.map(toWordView);
  const storyViews = sortedStories.map(toStoryView);
  const achievementViews = achievements.map(toAchievementView);

  const profileView: StudentProfileView = {
    ...baseProfileView,
    words: wordViews,
    stories: storyViews,
    achievements: achievementViews,
  };

  const payload: StudentDashboardPayload = {
    profile: profileView,
    recommendations: storyViews.slice(0, 3),
  };

  return payload;
};
