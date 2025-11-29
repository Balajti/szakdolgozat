import { randomUUID } from "node:crypto";
import type { Schema } from "../../data/resource";
import { getDBClient } from "../shared/dynamodb-client";
import type { AppSyncIdentityCognito, AppSyncResolverEvent } from "aws-lambda";

type Handler = Schema["startWordTranslation"]["functionHandler"];
type Identity = AppSyncIdentityCognito & { sub: string };

export const handler: Handler = async (event) => {
  const handlerStartTime = Date.now();
  console.log("[HANDLER] Started at:", new Date().toISOString());

  const appSyncEvent = event as AppSyncResolverEvent<any>;
  const { word, sourceLanguage, targetLanguage } = appSyncEvent.arguments as {
    word: string;
    sourceLanguage?: string;
    targetLanguage: string;
  };

  if (!word || !targetLanguage) {
    throw new Error("word and targetLanguage are required");
  }

  const sourceLang = sourceLanguage || "en";
  const identity = event.identity as Identity | undefined;
  const userId = identity?.sub || "unknown";

  // Create generation job
  const jobId = randomUUID();
  const db = getDBClient();

  await db.put("GenerationJob", {
    id: jobId,
    userId,
    type: "translation",
    status: "pending",
    input: { word, sourceLanguage: sourceLang, targetLanguage },
    startedAt: new Date().toISOString(),
  });

  console.log("[HANDLER] Created job:", jobId, "returning immediately");

  const elapsed = Date.now() - handlerStartTime;
  console.log("[HANDLER] Returned in:", elapsed, "ms");

  // Return immediately with jobId
  return {
    jobId,
    status: "pending" as const,
  };
};
