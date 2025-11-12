import type { Schema } from "../../data/resource";
import { getDataClient, unwrapListResult, unwrapOptionalResult, unwrapResult, type GraphQLResult } from "../shared/data-client";

const DEFAULT_LEVEL = "A1";
const DEFAULT_STREAK = 0;

type StudentProfileModel = Schema["StudentProfile"]["type"];
type AchievementModel = Schema["Achievement"]["type"];
type WordModel = Schema["Word"]["type"];
type StoryModel = Schema["Story"]["type"];
type StudentDashboardPayload = Schema["getStudentDashboard"]["returnType"];
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

  const achievementsResult = (await client.models.Achievement.list({
    filter: { studentId: { eq: studentId } },
    limit: 100,
  })) as ListResult<AchievementModel>;
  const { items: achievementItems } = unwrapListResult<AchievementModel>(achievementsResult);
  const achievements = achievementItems as AchievementModel[];

  const storiesResult = (await client.models.Story.list({
    filter: { studentId: { eq: studentId } },
    limit: 50,
  })) as ListResult<StoryModel>;
  const { items: storyItems } = unwrapListResult<StoryModel>(storiesResult);
  const stories = (storyItems as StoryModel[]).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  const masteredWordCount = words.filter((word) => word.mastery !== "unknown").length;
  if (profileRecord.vocabularyCount !== masteredWordCount) {
    await client.models.StudentProfile.update({
      id: studentId,
      vocabularyCount: masteredWordCount,
    });
  }

  const payload: StudentDashboardPayload = {
    profile: {
      ...profileRecord,
      email: profileRecord.email ?? fallbackEmail(studentId),
      birthday: profileRecord.birthday ?? null,
      avatarUrl: profileRecord.avatarUrl ?? null,
      level: profileRecord.level ?? DEFAULT_LEVEL,
      streak: profileRecord.streak ?? DEFAULT_STREAK,
      vocabularyCount: masteredWordCount,
    },
    recommendations: stories.slice(0, 3),
  };

  return payload;
};
