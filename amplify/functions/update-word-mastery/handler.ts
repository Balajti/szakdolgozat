import type { Schema } from "../../data/resource";
import { getDBClient, queryByIndex } from "../shared/dynamodb-client";

export const handler: Schema["updateWordMastery"]["functionHandler"] = async (event) => {
  const { studentId, wordId, mastery } = event.arguments;
  if (!studentId || !wordId || !mastery) {
    throw new Error("studentId, wordId, and mastery are required");
  }

  const db = getDBClient();
  const existingWord = await db.get("Word", wordId);

  if (!existingWord || existingWord.studentId !== studentId) {
    throw new Error("Word not found for student");
  }

  const now = new Date().toISOString();
  const updatedWord = await db.update("Word", wordId, {
    mastery,
    lastReviewedAt: now,
  });

  const words = await queryByIndex("Word", "byStudentId", "studentId", studentId, 500);
  const masteredCount = words.filter((word) => word.mastery !== "unknown").length;

  const profile = await db.get("StudentProfile", studentId);
  if (profile && Number(profile.vocabularyCount) !== masteredCount) {
    await db.update("StudentProfile", studentId, {
      vocabularyCount: masteredCount,
    });
  }

  return updatedWord as Schema["Word"]["type"];
};
