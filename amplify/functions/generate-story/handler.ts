import { randomUUID } from "node:crypto";
import type { AppSyncIdentityCognito } from "aws-lambda";
import type { Schema } from "../../data/resource";
import { getDBClient, queryByIndex, type DynamoDBItem } from "../shared/dynamodb-client";

type Handler = Schema["generateStory"]["functionHandler"];
type StoryGenerationPayload = Schema["generateStory"]["returnType"];
type StoryView = Schema["StoryView"]["type"];
type WordView = Schema["WordView"]["type"];
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
  if (!list) return [];
  return list
    .map((token) => token?.trim())
    .filter((token): token is string => Boolean(token && token.length > 0));
}

function resolveOwner(
  event: Parameters<Handler>[0],
  mode: GenerationMode,
): { studentId?: string; teacherId?: string } {
  const identity = event.identity as Identity | undefined;
  if (!identity) return {};
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
    mode: story.mode ? (String(story.mode) as GenerationMode) : null,
    unknownWordIds: Array.isArray(story.unknownWordIds) ? story.unknownWordIds.map(String) : [],
    highlightedWords: Array.isArray(story.highlightedWords) ? story.highlightedWords : [],
  };
};

const toWordView = (word: DynamoDBItem): WordView => {
  const fallbackTimestamp = new Date().toISOString();
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
  const db = getDBClient();

  if (ownership.studentId) {
    const profile = await db.get("StudentProfile", ownership.studentId);
    if (!profile) {
      await db.put("StudentProfile", {
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

  const newWords: DynamoDBItem[] = [];
  const unknownWordIds: string[] = [];

  if (ownership.studentId) {
    const existingWords = await queryByIndex("Word", "byStudentId", "studentId", ownership.studentId, 500);
    const byText = new Map(existingWords.map((word) => [String(word.text).toLowerCase(), word]));

    for (const token of sanitized.unknownWords) {
      const normalized = token.toLowerCase();
      const matched = byText.get(normalized);
      if (matched) {
        unknownWordIds.push(String(matched.id));
        continue;
      }

      const created = await db.put("Word", {
        id: randomUUID(),
        studentId: ownership.studentId,
        text: token,
        translation: token,
        exampleSentence: `Try using the word "${token}" in a sentence about your day.`,
        mastery: "unknown",
      });

      byText.set(normalized, created);
      unknownWordIds.push(String(created.id));
      newWords.push(created);
    }

    const words = await queryByIndex("Word", "byStudentId", "studentId", ownership.studentId, 500);
    const masteredCount = words.filter((word) => word.mastery !== "unknown").length;

    const profile = await db.get("StudentProfile", ownership.studentId);
    if (profile && Number(profile.vocabularyCount) !== masteredCount) {
      await db.update("StudentProfile", ownership.studentId, {
        vocabularyCount: masteredCount,
      });
    }
  }

  const story = await db.put("Story", {
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
  });

  const payload: StoryGenerationPayload = {
    story: toStoryView(story),
    newWords: newWords.map(toWordView),
  };

  return payload;
};
