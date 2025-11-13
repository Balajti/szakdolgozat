import type { Schema } from "../../data/resource";
import { getDataClient, unwrapListResult, unwrapOptionalResult, unwrapResult, type GraphQLResult } from "../shared/data-client";

type WordModel = Schema["Word"]["type"];
type StudentProfileModel = Schema["StudentProfile"]["type"];
type ListResult<T> = GraphQLResult<T[]> & { nextToken?: string | null };

export const handler: Schema["updateWordMastery"]["functionHandler"] = async (event) => {
  const { studentId, wordId, mastery } = event.arguments;
  if (!studentId || !wordId || !mastery) {
    throw new Error("studentId, wordId, and mastery are required");
  }

  const client = await getDataClient();
  const wordResult = (await client.models.Word.get({ id: wordId })) as GraphQLResult<WordModel>;
  const existingWord = unwrapOptionalResult<WordModel>(wordResult);

  if (!existingWord || existingWord.studentId !== studentId) {
    throw new Error("Word not found for student");
  }

  const now = new Date().toISOString();
  const updatedWord = unwrapResult<WordModel>(
    (await client.models.Word.update({
      id: wordId,
      mastery,
      lastReviewedAt: now,
    })) as GraphQLResult<WordModel>,
    "Failed to update word mastery",
  );

  const wordsResult = (await client.models.Word.list({
    filter: { studentId: { eq: studentId } },
    limit: 500,
  })) as ListResult<WordModel>;
  const masteredCount = unwrapListResult<WordModel>(wordsResult).items.filter((word) => word.mastery !== "unknown").length;

  const profileResult = (await client.models.StudentProfile.get({ id: studentId })) as GraphQLResult<StudentProfileModel>;
  const profile = unwrapOptionalResult<StudentProfileModel>(profileResult);
  if (profile && profile.vocabularyCount !== masteredCount) {
    await client.models.StudentProfile.update({
      id: studentId,
      vocabularyCount: masteredCount,
    });
  }

  return updatedWord;
};
