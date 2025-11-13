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
type StoryGenerationPayload = Schema["generateStory"]["returnType"];
type StoryView = Schema["StoryView"]["type"];
type WordView = Schema["WordView"]["type"];
type ListResult<T> = GraphQLResult<T[]> & { nextToken?: string | null };
type Identity = AppSyncIdentityCognito & { sub: string };

type GenerationMode = "placement" | "personalized" | "teacher";

type SanitizedInput = {
  level: string;
  age: number;
  knownWords: string[];
  unknownWords: string[];
  requiredWords: string[];
  excludedWords: string[];
  mode: GenerationMode;
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
  mode: GenerationMode,
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

export const handler: Handler = async (event) => {
  const { level, age, mode, knownWords, unknownWords, requiredWords, excludedWords } = event.arguments as {
    level: string; age: number; mode: GenerationMode;
    knownWords: (string | null | undefined)[] | null | undefined;
    unknownWords: (string | null | undefined)[] | null | undefined;
    requiredWords?: (string | null | undefined)[] | null | undefined;
    excludedWords?: (string | null | undefined)[] | null | undefined;
  };

  if (!level || !age || !mode) {
    throw new Error("level, age, and mode are required");
  }

  const sanitized: SanitizedInput = {
    level,
    age,
    mode,
    knownWords: normalizeWordList(knownWords),
    unknownWords: normalizeWordList(unknownWords),
    requiredWords: normalizeWordList(requiredWords),
    excludedWords: normalizeWordList(excludedWords),
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
    story: toStoryView(story),
    newWords: newWords.map(toWordView),
  };

  return payload;
};
