import { randomUUID } from "node:crypto";

import type { AppSyncIdentityCognito } from "aws-lambda";

import type { Schema } from "../../data/resource";
import {
  getDataClient,
  unwrapListResult,
  unwrapOptionalResult,
  unwrapResult,
  type GraphQLResult,
} from "../shared/data-client";

type Handler = Schema["generateStory"]["functionHandler"];
type StoryModel = Schema["Story"]["type"];
type WordModel = Schema["Word"]["type"];
type StudentProfileModel = Schema["StudentProfile"]["type"];
type StoryGenerationInputModel = Schema["StoryGenerationInput"]["type"];
type StoryGenerationPayload = Schema["generateStory"]["returnType"];
type ListResult<T> = GraphQLResult<T[]> & { nextToken?: string | null };
type Identity = AppSyncIdentityCognito & { sub: string };

type SanitizedInput = Omit<StoryGenerationInputModel, "knownWords" | "unknownWords" | "requiredWords" | "excludedWords"> & {
  knownWords: string[];
  unknownWords: string[];
  requiredWords: string[];
  excludedWords: string[];
};

function normalizeWordList(list?: (string | null | undefined)[] | null): string[] {
  if (!list) {
    return [];
  }

  return list
    .map((token) => token?.trim())
    .filter((token): token is string => Boolean(token && token.length > 0));
}

function resolveOwner(
  event: Parameters<Handler>[0],
  mode: StoryGenerationInputModel["mode"],
): { studentId?: string; teacherId?: string } {
  const identity = event.identity as Identity | undefined;
  if (!identity) {
    return {};
  }

  return mode === "teacher"
    ? { teacherId: identity.sub }
    : { studentId: identity.sub };
}

function synthesizeStory(input: SanitizedInput): { title: string; content: string } {
  const { level, age, knownWords, unknownWords, requiredWords, mode } = input;
  const focusWords = [...new Set([...requiredWords, ...unknownWords])];
  const vocabulary = [...new Set([...knownWords, ...focusWords])];

  const title = mode === "teacher" ? `Assignment Story (${level})` : `Personalized Story (${level})`;
  const intro = `This story is tailored for a ${age}-year-old ${mode} session at level ${level}.`;
  const vocabularyLine = vocabulary.length > 0
    ? `It uses these focus words: ${vocabulary.join(", ")}.`
    : "It reinforces previously mastered vocabulary.";
  const challengeLine = focusWords.length > 0
    ? `Pay extra attention to practicing ${focusWords.join(", ")}.`
    : "There are no new challenge words this time.";

  const body = `Once upon a time, a curious learner explored English through playful moments. Each sentence wove known words with exciting surprises, building confidence step by step.`;
  const conclusion = `By the end of the story, our learner felt proud and ready to use these words in real conversations.`;

  return {
    title,
    content: [intro, vocabularyLine, challengeLine, "", body, conclusion].join("\n"),
  };
}

export const handler: Handler = async (event) => {
  const rawInput = event.arguments.input;
  if (!rawInput) {
    throw new Error("input is required");
  }

  const sanitized: SanitizedInput = {
    ...rawInput,
    knownWords: normalizeWordList(rawInput.knownWords as (string | null | undefined)[] | null | undefined),
    unknownWords: normalizeWordList(rawInput.unknownWords as (string | null | undefined)[] | null | undefined),
    requiredWords: normalizeWordList(rawInput.requiredWords as (string | null | undefined)[] | null | undefined),
    excludedWords: normalizeWordList(rawInput.excludedWords as (string | null | undefined)[] | null | undefined),
  };

  const ownership = resolveOwner(event, sanitized.mode);
  const client = await getDataClient();

  if (ownership.studentId) {
    const profileResult = (await client.models.StudentProfile.get({ id: ownership.studentId })) as GraphQLResult<StudentProfileModel>;
    const profile = unwrapOptionalResult<StudentProfileModel>(profileResult);
    if (!profile) {
      await client.models.StudentProfile.create({
        id: ownership.studentId,
        name: "New Learner",
        email: `${ownership.studentId}@students.wordnest.local`,
        level: "A1",
        streak: 0,
        vocabularyCount: 0,
      });
    }
  }

  const storyDraft = synthesizeStory(sanitized);
  const timestamp = new Date().toISOString();

  const newWords: WordModel[] = [];
  const unknownWordIds: string[] = [];

  if (ownership.studentId) {
    const existingWordsResult = (await client.models.Word.list({
      filter: { studentId: { eq: ownership.studentId } },
      limit: 500,
    })) as ListResult<WordModel>;
    const existingWords = unwrapListResult<WordModel>(existingWordsResult).items as WordModel[];
    const byText = new Map(existingWords.map((word) => [word.text.toLowerCase(), word]));

    for (const token of sanitized.unknownWords) {
      const normalized = token.toLowerCase();
      const matched = byText.get(normalized);
      if (matched) {
        unknownWordIds.push(matched.id);
        continue;
      }

      const created = unwrapResult<WordModel>(
        (await client.models.Word.create({
          studentId: ownership.studentId,
          text: token,
          translation: token,
          exampleSentence: `Try using the word \"${token}\" in a sentence about your day.`,
          mastery: "unknown",
        })) as GraphQLResult<WordModel>,
        `Failed to create vocabulary entry for ${token}`,
      );

      byText.set(normalized, created);
      unknownWordIds.push(created.id);
      newWords.push(created);
    }

    const wordsResult = (await client.models.Word.list({
      filter: { studentId: { eq: ownership.studentId } },
      limit: 500,
    })) as ListResult<WordModel>;
    const words = unwrapListResult<WordModel>(wordsResult).items as WordModel[];
    const masteredCount = words.filter((word) => word.mastery !== "unknown").length;

    const profileResult = (await client.models.StudentProfile.get({ id: ownership.studentId })) as GraphQLResult<StudentProfileModel>;
    const profile = unwrapOptionalResult<StudentProfileModel>(profileResult);
    if (profile && profile.vocabularyCount !== masteredCount) {
      await client.models.StudentProfile.update({
        id: ownership.studentId,
        vocabularyCount: masteredCount,
      });
    }
  }

  const story = unwrapResult<StoryModel>(
    (await client.models.Story.create({
      id: randomUUID(),
      studentId: ownership.studentId,
      teacherId: ownership.teacherId,
      title: storyDraft.title,
      content: storyDraft.content,
      level: sanitized.level ?? "A1",
      mode: sanitized.mode,
      createdAt: timestamp,
      unknownWordIds,
      highlightedWords: [],
    })) as GraphQLResult<StoryModel>,
    "Failed to store generated story",
  );

  const payload: StoryGenerationPayload = {
    story,
    newWords,
  };

  return payload;
};
