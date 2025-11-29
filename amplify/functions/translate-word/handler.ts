import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import type { Schema } from "../../data/resource";
import { getDBClient } from "../shared/dynamodb-client";
import type { AppSyncIdentityCognito, AppSyncResolverEvent } from "aws-lambda";

type Handler = Schema["startWordTranslation"]["functionHandler"];
type Identity = AppSyncIdentityCognito & { sub: string };

interface WordDetails {
  word: string;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  exampleSentence: string;
  exampleTranslation: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  pastTense: string | null;
  futureTense: string | null;
  pluralForm: string | null;
  usageNotes: string | null;
}

async function translateWithAI(
  word: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<WordDetails> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a language learning assistant. Provide comprehensive information about the English word "${word}" for a Hungarian student learning English.

Analyze the word and provide:
1. Hungarian translation
2. Part of speech (noun, verb, adjective, etc.) - in Hungarian
3. Phonetic pronunciation (IPA format if possible)
4. If it's a verb: provide past tense and future tense forms
5. If it's a noun: provide plural form
6. A natural example sentence using this word in English (NOT a generic template)
7. Hungarian translation of the example sentence
8. Brief usage notes in Hungarian explaining when/how to use this word

**Format your response as JSON:**
{
  "word": "${word}",
  "translation": "Hungarian translation here",
  "partOfSpeech": "főnév/ige/melléknév/stb (in Hungarian)",
  "phonetic": "pronunciation in IPA format or simple phonetic",
  "pastTense": "past tense form (only for verbs, otherwise null)",
  "futureTense": "will + verb form (only for verbs, otherwise null)",
  "pluralForm": "plural form (only for nouns, otherwise null)",
  "exampleSentence": "A natural, creative example sentence in English using '${word}'",
  "exampleTranslation": "Hungarian translation of the example sentence",
  "usageNotes": "Brief explanation in Hungarian of when and how to use this word"
}

Important: 
- Make the example sentence natural and contextual, not a template
- Write usageNotes in Hungarian
- Write partOfSpeech in Hungarian (főnév, ige, melléknév, határozószó, etc.)`;

  console.log("Calling Gemini API for word translation...");
  console.log("Using model: gemini-2.5-flash");

  const startTime = Date.now();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const elapsed = Date.now() - startTime;
  console.log(`Gemini API response received in ${elapsed}ms`);

  const text = response.text;
  if (!text) {
    throw new Error("No response from Gemini API");
  }

  console.log("Gemini response text length:", text.length);

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Failed to extract JSON from response:", text);
    throw new Error("Failed to parse JSON from Gemini response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as WordDetails;
  console.log("Translation successful:", parsed.translation);

  return {
    word: parsed.word || word,
    translation: parsed.translation || word,
    sourceLanguage,
    targetLanguage,
    exampleSentence: parsed.exampleSentence || `Example with ${word}.`,
    exampleTranslation: parsed.exampleTranslation || "",
    phonetic: parsed.phonetic || null,
    partOfSpeech: parsed.partOfSpeech || null,
    pastTense: parsed.pastTense || null,
    futureTense: parsed.futureTense || null,
    pluralForm: parsed.pluralForm || null,
    usageNotes: parsed.usageNotes || null,
  };
}

function getFallbackTranslation(word: string, sourceLang: string, targetLang: string): WordDetails {
  console.log("Using fallback translation for:", word);
  return {
    word,
    translation: `[Translation for "${word}"]`,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    exampleSentence: `The student used the word "${word}" in their essay.`,
    exampleTranslation: targetLang === "hu" ? `A diák a "${word}" szót használta az esszéjében.` : "",
    phonetic: null,
    partOfSpeech: null,
    pastTense: null,
    futureTense: null,
    pluralForm: null,
    usageNotes: "Please ensure you have a stable internet connection for detailed translations.",
  };
}

async function publishTranslationResult(
  jobId: string,
  status: "completed" | "failed",
  translation?: WordDetails,
  error?: string
) {
  const endpoint = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
  if (!endpoint) {
    console.error("AMPLIFY_DATA_GRAPHQL_ENDPOINT not set, cannot publish result");
    return;
  }

  const mutation = `
    mutation PublishTranslationResult($input: PublishTranslationResultInput!) {
      publishTranslationResult(input: $input) {
        jobId
        status
      }
    }
  `;

  const variables = {
    input: {
      jobId,
      status,
      translation,
      error,
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.AMPLIFY_DATA_API_KEY || "",
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    if (!response.ok) {
      console.error("Failed to publish translation result:", await response.text());
    } else {
      console.log("Translation result published successfully for jobId:", jobId);
    }
  } catch (error) {
    console.error("Error publishing translation result:", error);
  }
}

async function processWordTranslation(
  jobId: string,
  word: string,
  sourceLanguage: string,
  targetLanguage: string
) {
  const db = getDBClient();

  try {
    console.log("[ASYNC] Starting background word translation for jobId:", jobId);

    // Update job status to processing
    await db.update("GenerationJob", jobId, {
      status: "processing",
    });

    // Translate with AI (can take 30+ seconds)
    const translation = await translateWithAI(word, sourceLanguage, targetLanguage);

    const timestamp = new Date().toISOString();

    // Update job with result
    await db.update("GenerationJob", jobId, {
      status: "completed",
      completedAt: timestamp,
      result: translation,
    });

    // Publish result to subscribers
    await publishTranslationResult(jobId, "completed", translation);

    console.log("[ASYNC] Word translation completed successfully for jobId:", jobId);
  } catch (error) {
    console.error("[ASYNC] Error in background word translation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Use fallback translation
    const fallback = getFallbackTranslation(word, sourceLanguage, targetLanguage);

    // Update job with fallback result (still mark as completed)
    await db.update("GenerationJob", jobId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      result: fallback,
      error: errorMessage,
    });

    // Publish fallback to subscribers
    await publishTranslationResult(jobId, "completed", fallback);
  }
}

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

  // Start background processing (don't await)
  processWordTranslation(jobId, word, sourceLang, targetLanguage).catch(err => {
    console.error("[HANDLER] Background processing error:", err);
  });

  const elapsed = Date.now() - handlerStartTime;
  console.log("[HANDLER] Returned in:", elapsed, "ms");

  // Return immediately with jobId
  return {
    jobId,
    status: "pending" as const,
  };
};
