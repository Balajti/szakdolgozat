import { randomUUID } from "node:crypto";
import type { AppSyncIdentityCognito, AppSyncResolverEvent } from "aws-lambda";
import type { Schema } from "../../data/resource";
import { getDBClient } from "../shared/dynamodb-client";

type Handler = Schema["startStoryGeneration"]["functionHandler"];
type Identity = AppSyncIdentityCognito & { sub: string };
type GenerationMode = "placement" | "personalized" | "teacher";

type SanitizedInput = {
  level: string;
  age: number;

  unknownWords: string[];
  requiredWords: string[];
  excludedWords: string[];
  mode: GenerationMode;
  topic?: string;
  difficulty?: string;
};

function normalizeWordList(list?: (string | null | undefined)[] | null): string[] {
  if (!list) return [];
  return list
    .map((token) => token?.trim())
    .filter((token): token is string => Boolean(token && token.length > 0));
}

export const handler: Handler = async (event) => {
  const handlerStartTime = Date.now();
  console.log("[HANDLER] Started at:", new Date().toISOString());

  const appSyncEvent = event as AppSyncResolverEvent<any>;
  const { level, age, mode, unknownWords, requiredWords, excludedWords, topic, customWords, difficulty } = appSyncEvent.arguments as {
    level: string;
    age?: number | null;
    mode: GenerationMode;

    unknownWords?: (string | null | undefined)[] | null;
    requiredWords?: (string | null | undefined)[] | null;
    excludedWords?: (string | null | undefined)[] | null;
    topic?: string | null;
    customWords?: (string | null | undefined)[] | null;
    difficulty?: string | null;
  };

  if (!level || !mode) {
    throw new Error("level and mode are required");
  }

  // Default age based on level if not provided
  const defaultAge = age || (level === "A1" ? 8 : level === "A2" ? 10 : level === "B1" ? 12 : level === "B2" ? 14 : 16);

  // Merge customWords into requiredWords
  const allRequiredWords = [
    ...(requiredWords || []),
    ...(customWords || [])
  ];

  const sanitized: SanitizedInput = {
    level,
    age: defaultAge,
    mode,

    unknownWords: normalizeWordList(unknownWords),
    requiredWords: normalizeWordList(allRequiredWords),
    excludedWords: normalizeWordList(excludedWords),
    topic: topic?.trim() || undefined,
    difficulty: difficulty?.trim() || undefined,
  };

  const identity = event.identity as Identity | undefined;
  const userId = identity?.sub || "unknown";

  // Create generation job
  const jobId = randomUUID();
  const db = getDBClient();

  await db.put("GenerationJob", {
    id: jobId,
    userId,
    type: "story",
    status: "pending",
    input: sanitized,
    startedAt: new Date().toISOString(),
  });

  console.log("[HANDLER] Created job:", jobId);

  const elapsed = Date.now() - handlerStartTime;
  console.log("[HANDLER] Returned in:", elapsed, "ms");

  // Return immediately with jobId
  return {
    jobId,
    status: "pending" as const,
  };
};
