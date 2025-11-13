import type { Schema } from "../../data/resource";
import { getDataClient, unwrapListResult, unwrapOptionalResult, unwrapResult, type GraphQLResult } from "../shared/data-client";

const DEFAULT_LEVEL = "A1";
const DEFAULT_STREAK = 0;

type StudentProfileModel = Schema["StudentProfile"]["type"];
type WordModel = Schema["Word"]["type"];
type StoryModel = Schema["Story"]["type"];
type AchievementModel = Schema["Achievement"]["type"];
type StudentDashboardPayload = Schema["getStudentDashboard"]["returnType"];
type StoryView = Schema["StoryView"]["type"];
type StudentProfileView = Schema["StudentProfileView"]["type"];
type WordView = Schema["WordView"]["type"];
type AchievementView = Schema["AchievementView"]["type"];
type ListResult<T> = GraphQLResult<T[]> & { nextToken?: string | null };

function fallbackEmail(id: string): string {
  return `${id}@students.wordnest.local`;
}

export const handler: Schema["getStudentDashboard"]["functionHandler"] = async (event) => {
  const { id } = event.arguments;
  if (!id) {
    throw new Error("Student identifier is required");
  }

  const studentId = id as string;
  const client = await getDataClient();

  const profileResult = (await client.models.StudentProfile.get({ id: studentId })) as GraphQLResult<StudentProfileModel>;
  const existingProfile = unwrapOptionalResult<StudentProfileModel>(profileResult);

  const profileRecord: StudentProfileModel = existingProfile
    ?? unwrapResult<StudentProfileModel>(
      await client.models.StudentProfile.create({
        id: studentId,
        name: "New Learner",
        email: fallbackEmail(studentId),
        level: DEFAULT_LEVEL,
        streak: DEFAULT_STREAK,
        vocabularyCount: 0,
      }),
      "Failed to create a student profile",
    );

  const wordsResult = (await client.models.Word.list({
    filter: { studentId: { eq: studentId } },
    limit: 500,
  })) as ListResult<WordModel>;
  const { items: wordItems } = unwrapListResult<WordModel>(wordsResult);
  const words = wordItems as WordModel[];

  const storiesResult = (await client.models.Story.list({
    filter: { studentId: { eq: studentId } },
    limit: 50,
  })) as ListResult<StoryModel>;
  const { items: storyItems } = unwrapListResult<StoryModel>(storiesResult);
  const stories = (storyItems as StoryModel[]).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  const achievementsResult = (await client.models.Achievement.list({
    filter: { studentId: { eq: studentId } },
    limit: 100,
  })) as ListResult<AchievementModel>;
  const { items: achievementItems } = unwrapListResult<AchievementModel>(achievementsResult);
  const achievements = achievementItems as AchievementModel[];

  const masteredWordCount = words.filter((word) => word.mastery !== "unknown").length;
  if (profileRecord.vocabularyCount !== masteredWordCount) {
    await client.models.StudentProfile.update({
      id: studentId,
      vocabularyCount: masteredWordCount,
    });
  }

  const profileFallback = new Date().toISOString();

  const baseProfileView: Omit<StudentProfileView, 'achievements' | 'words' | 'stories'> = {
    id: profileRecord.id,
    name: profileRecord.name,
    email: profileRecord.email ?? fallbackEmail(studentId),
    birthday: profileRecord.birthday ?? null,
    avatarUrl: profileRecord.avatarUrl ?? null,
    level: profileRecord.level ?? DEFAULT_LEVEL,
    streak: profileRecord.streak ?? DEFAULT_STREAK,
    vocabularyCount: masteredWordCount,
    createdAt: profileRecord.createdAt ?? profileFallback,
    updatedAt: profileRecord.updatedAt ?? profileRecord.createdAt ?? profileFallback,
  };

  const toStoryView = (story: StoryModel): StoryView => {
    const fallbackTimestamp = new Date().toISOString();

    return {
      id: story.id,
      studentId: story.studentId ?? null,
      teacherId: story.teacherId ?? null,
      title: story.title,
      content: story.content,
      level: story.level,
      createdAt: story.createdAt ?? fallbackTimestamp,
      updatedAt: story.updatedAt ?? story.createdAt ?? fallbackTimestamp,
      mode: story.mode ?? null,
      unknownWordIds: story.unknownWordIds ?? [],
      highlightedWords: story.highlightedWords ?? [],
    };
  };

  const toWordView = (word: WordModel): WordView => {
    const fallbackTimestamp = new Date().toISOString();

    if (!word.studentId) {
      throw new Error("Word record is missing studentId");
    }

    return {
      id: word.id,
      studentId: word.studentId,
      text: word.text,
      translation: word.translation,
      exampleSentence: word.exampleSentence ?? null,
      mastery: word.mastery,
      lastReviewedAt: word.lastReviewedAt ?? null,
      createdAt: word.createdAt ?? fallbackTimestamp,
      updatedAt: word.updatedAt ?? word.createdAt ?? fallbackTimestamp,
    };
  };

  const toAchievementView = (achievement: AchievementModel): AchievementView => {
    const fallbackTimestamp = new Date().toISOString();
    const fallbackDate = fallbackTimestamp.slice(0, 10);

    return {
      id: achievement.id,
      studentId: achievement.studentId,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      achievedAt: achievement.achievedAt ?? fallbackDate,
      createdAt: achievement.createdAt ?? fallbackTimestamp,
      updatedAt: achievement.updatedAt ?? achievement.createdAt ?? fallbackTimestamp,
    };
  };

  const wordViews = words.map(toWordView);
  const storyViews = stories.map(toStoryView);
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
