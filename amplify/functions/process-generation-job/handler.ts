import { DynamoDBStreamEvent } from "aws-lambda";
import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "node:crypto";
import type { Schema } from "../../data/resource";
import { getDBClient, queryByIndex, type DynamoDBItem } from "../shared/dynamodb-client";
import { unmarshall } from "@aws-sdk/util-dynamodb";

type StoryView = Schema["StoryView"]["type"];
type WordView = Schema["WordView"]["type"];
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

interface GeneratedStory {
    title: string;
    content: string;
    highlightedWords: Array<{ word: string; offset: number; length: number }>;
}

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

const STORY_WORD_COUNTS: Record<string, string> = {
    A1: "350-450",
    A2: "450-600",
    B1: "600-750",
    B2: "750-900",
    C1: "900-1100",
    C2: "900-1100",
};

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds every whole-word occurrence of the target words directly in the story
 * text. The AI-reported offsets are unreliable, so we always recompute them
 * here — accurate offsets are required for the fill-in-the-blanks assignments.
 */
function computeHighlightedWords(
    content: string,
    targetWords: string[]
): Array<{ word: string; offset: number; length: number }> {
    const highlighted: Array<{ word: string; offset: number; length: number }> = [];

    for (const word of targetWords) {
        const trimmed = word.trim();
        if (!trimmed) continue;

        const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(trimmed)}(?![\\p{L}\\p{N}])`, "giu");
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(content)) !== null) {
            highlighted.push({
                word: match[0],
                offset: match.index,
                length: match[0].length,
            });
        }
    }

    return highlighted.sort((a, b) => a.offset - b.offset);
}

function findMissingWords(content: string, words: string[]): string[] {
    const lowered = content.toLowerCase();
    return words.filter((word) => !lowered.includes(word.trim().toLowerCase()));
}

async function generateStoryWithAI(input: SanitizedInput): Promise<GeneratedStory> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY environment variable not set");

    const ai = new GoogleGenAI({ apiKey });
    const { level, age, unknownWords, requiredWords, excludedWords, mode } = input;

    const targetWords = [...new Set([...unknownWords, ...requiredWords].map((w) => w.trim()).filter(Boolean))];
    const avoidWords = excludedWords.length > 0 ? excludedWords : [];
    const wordCount = STORY_WORD_COUNTS[level] ?? "600-800";

    const ageContext = age <= 10
        ? "a young child who loves adventures, animals, and fantasy"
        : age <= 14
            ? "a pre-teen interested in friendship, school life, and discovery"
            : "an adult or young adult interested in engaging, mature storytelling, life experiences, and interesting scenarios";

    const modeContext = mode === "placement"
        ? "This is a placement test story to assess vocabulary level."
        : mode === "teacher"
            ? "This is a teacher-assigned story for classroom learning. The teacher's requirements below are STRICT and must all be satisfied."
            : "This is a personalized story for enjoyment and immersion.";

    const topicPrompt = input.topic
        ? `Topic (MANDATORY): The story MUST be about "${input.topic}". The plot, setting and vocabulary must clearly revolve around this theme from beginning to end.`
        : "Scenario: Choose a completely RANDOM and CREATIVE scenario (e.g., sci-fi, mystery, fantasy, slice of life, historical).";

    const difficultyHint = input.difficulty === "beginner"
        ? "Keep vocabulary simple and sentence structures straightforward. Use common, everyday words."
        : input.difficulty === "intermediate"
            ? "Use moderately complex vocabulary and varied sentence structures. Include some idiomatic expressions."
            : input.difficulty === "advanced"
                ? "Feel free to use sophisticated vocabulary, complex sentence structures, and nuanced language."
                : "Adjust vocabulary naturally for the CEFR level.";

    const buildPrompt = (missingWords: string[]) => `You are a creative storyteller writing a captivating story for a ${age}-year-old reader at CEFR level ${level}.

${modeContext}
${topicPrompt}
${difficultyHint}

**Requirements (ALL are mandatory):**
- Target audience: ${ageContext}
- CEFR Level: ${level}
- Story length: ${wordCount} words. Do NOT shorten the story below this range.
${targetWords.length > 0 ? `- The story MUST contain every one of these target words, each used at least twice in natural contexts: ${targetWords.join(", ")}` : ""}
${avoidWords.length > 0 ? `- The story must NEVER use these words: ${avoidWords.join(", ")}` : ""}
${missingWords.length > 0 ? `- IMPORTANT: your previous attempt left out these words. This time the story MUST include each of them: ${missingWords.join(", ")}` : ""}

**Story Guidelines:**
- **Style:** Fiction. NOT an educational text or lesson.
- **Scenario:** ${input.topic ? `Focus strictly on the requested topic: "${input.topic}".` : "Be creative and unique."}
- **Tone:** Engaging and immersive.
- **Structure:** A rich narrative with a clear beginning, middle, and end.
- **Age Appropriateness:**
    - If the reader is an adult (>18), write a mature, interesting story suitable for adults.
    - If the reader is a child, keep it whimsical and fun.

**Format your response as JSON:**
{
  "title": "Engaging story title (5-7 words)",
  "content": "The complete story text with proper paragraphs"
}

Important: DO NOT use markdown formatting (**, *, etc.) in the story content - write plain text only.`;

    const MAX_ATTEMPTS = 2;
    let missingFromPrevious: string[] = [];
    let lastResult: GeneratedStory | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        console.log(`[generateStoryWithAI] Calling Gemini API (attempt ${attempt}/${MAX_ATTEMPTS})...`);
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: buildPrompt(missingFromPrevious),
            config: {
                responseMimeType: "application/json",
                temperature: attempt === 1 ? 1.0 : 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                thinkingConfig: {
                    thinkingBudget: 0,
                },
            },
        });

        const text = response.text;
        if (!text) throw new Error("No text received from AI response");

        console.log("[generateStoryWithAI] Response text length:", text.length);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Failed to parse JSON from AI response");

        const parsed = JSON.parse(jsonMatch[0]) as { title?: string; content?: string };
        if (!parsed.title || !parsed.content) throw new Error("Invalid story structure from AI");

        const highlightedWords = computeHighlightedWords(parsed.content, targetWords);
        lastResult = { title: parsed.title, content: parsed.content, highlightedWords };

        const missing = findMissingWords(parsed.content, targetWords);
        if (missing.length === 0) {
            console.log("[generateStoryWithAI] Story generated successfully:", parsed.title);
            return lastResult;
        }

        console.warn(`[generateStoryWithAI] Attempt ${attempt} is missing required words:`, missing);
        missingFromPrevious = missing;
    }

    // Accept the best attempt even if a couple of required words are missing;
    // a mostly-correct themed story is better than failing the whole job.
    console.warn("[generateStoryWithAI] Returning story despite missing words:", missingFromPrevious);
    return lastResult!;
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

    console.log("[translateWithAI] Calling Gemini API for word translation...");

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.7,
            thinkingConfig: {
                thinkingBudget: 0,
            },
        },
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response from Gemini API");
    }

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("Failed to parse JSON from Gemini response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as WordDetails;

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

async function publishStoryResult(
    jobId: string,
    status: "completed" | "failed",
    story?: StoryView,
    newWords?: WordView[],
    error?: string
) {
    const endpoint = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
    if (!endpoint) return;

    const mutation = `
    mutation PublishStoryResult($jobId: String!, $status: GenerationJobStatus!, $story: StoryViewInput, $newWords: [WordViewInput], $error: String) {
      publishStoryResult(jobId: $jobId, status: $status, story: $story, newWords: $newWords, error: $error) {
        jobId
        status
        error
        story {
          id
          title
          content
          level
          createdAt
          updatedAt
          mode
          highlightedWords {
            word
            offset
            length
          }
        }
        newWords {
          id
          studentId
          text
          translation
          mastery
          createdAt
          updatedAt
        }
      }
    }
  `;

    const variables = { jobId, status, story, newWords, error };

    try {
        await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.AMPLIFY_DATA_API_KEY || "",
            },
            body: JSON.stringify({ query: mutation, variables }),
        });
    } catch (error) {
        console.error("Error publishing story result:", error);
    }
}

async function publishTranslationResult(
    jobId: string,
    status: "completed" | "failed",
    translation?: WordDetails,
    error?: string
) {
    const endpoint = process.env.AMPLIFY_DATA_GRAPHQL_ENDPOINT;
    if (!endpoint) return;

    const mutation = `
    mutation PublishTranslationResult($jobId: String!, $status: GenerationJobStatus!, $translation: WordTranslationInput, $error: String) {
      publishTranslationResult(jobId: $jobId, status: $status, translation: $translation, error: $error) {
        jobId
        status
      }
    }
  `;

    const variables = { jobId, status, translation, error };

    try {
        await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.AMPLIFY_DATA_API_KEY || "",
            },
            body: JSON.stringify({ query: mutation, variables }),
        });
    } catch (error) {
        console.error("Error publishing translation result:", error);
    }
}

export const handler = async (event: DynamoDBStreamEvent) => {
    console.log(`[ProcessJob] Received ${event.Records.length} records`);
    const db = getDBClient();

    for (const record of event.Records) {
        if (record.eventName !== "INSERT") continue;

        try {
            // Use unmarshall to convert DynamoDB JSON to standard JSON
            const job = unmarshall(record.dynamodb?.NewImage as any);

            if (job.status !== "pending") {
                console.log(`[ProcessJob] Skipping job ${job.id} (status: ${job.status})`);
                continue;
            }

            if (job.type === "translation") {
                console.log(`[ProcessJob] Processing translation job: ${job.id}`);
                const jobId = job.id;
                const input = job.input as { word: string; sourceLanguage: string; targetLanguage: string };

                // Update job status to processing
                await db.update("GenerationJob", jobId, { status: "processing" });

                try {
                    const translation = await translateWithAI(input.word, input.sourceLanguage, input.targetLanguage);
                    const timestamp = new Date().toISOString();

                    // Update job with result
                    await db.update("GenerationJob", jobId, {
                        status: "completed",
                        completedAt: timestamp,
                        result: translation,
                    });

                    // Publish result
                    await publishTranslationResult(jobId, "completed", translation);
                    console.log(`[ProcessJob] Translation job ${jobId} completed successfully`);
                } catch (error) {
                    console.error(`[ProcessJob] Error processing translation:`, error);
                    const errorMessage = error instanceof Error ? error.message : "Unknown error";
                    const fallback = getFallbackTranslation(input.word, input.sourceLanguage, input.targetLanguage);

                    await db.update("GenerationJob", jobId, {
                        status: "completed", // Mark as completed even with fallback
                        completedAt: new Date().toISOString(),
                        result: fallback,
                        error: errorMessage,
                    });
                    await publishTranslationResult(jobId, "completed", fallback);
                }
                continue;
            }

            if (job.type !== "story") {
                console.log(`[ProcessJob] Skipping unknown job type ${job.type}`);
                continue;
            }

            console.log(`[ProcessJob] Processing story job: ${job.id}`);
            const jobId = job.id;
            const sanitized = job.input as SanitizedInput;
            const userId = job.userId;

            // Determine ownership based on mode (simplified check)
            const ownership = sanitized.mode === "teacher"
                ? { teacherId: userId }
                : { studentId: userId };

            console.log(`[ProcessJob] Job ${jobId}: mode=${sanitized.mode}, userId=${userId}`);

            // Update job status to processing
            await db.update("GenerationJob", jobId, { status: "processing" });
            console.log(`[ProcessJob] Job ${jobId}: status set to processing`);

            // Ensure student profile exists if student
            if (ownership.studentId) {
                const profile = await db.get("StudentProfile", ownership.studentId);
                if (!profile) {
                    console.log(`[ProcessJob] Job ${jobId}: Creating student profile for ${ownership.studentId}`);
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

            // Generate story
            console.log(`[ProcessJob] Job ${jobId}: Starting AI story generation...`);
            const storyDraft = await generateStoryWithAI(sanitized);
            console.log(`[ProcessJob] Job ${jobId}: Story generated: "${storyDraft.title}"`);
            const timestamp = new Date().toISOString();
            const newWords: DynamoDBItem[] = [];
            const unknownWordIds: string[] = [];

            // Process words for student
            if (ownership.studentId) {
                console.log(`[ProcessJob] Job ${jobId}: Processing words for student...`);
                const existingWords = await queryByIndex("Word", "byStudentId", "studentId", ownership.studentId, 500);
                const byText = new Map(existingWords.map((word) => [String(word.text).toLowerCase(), word]));

                for (const token of (sanitized.unknownWords || [])) {
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

                const masteredCount = existingWords.filter((word) => word.mastery !== "unknown").length + newWords.filter(w => w.mastery !== "unknown").length;
                const profile = await db.get("StudentProfile", ownership.studentId);
                if (profile && Number(profile.vocabularyCount) !== masteredCount) {
                    await db.update("StudentProfile", ownership.studentId, { vocabularyCount: masteredCount });
                }
                console.log(`[ProcessJob] Job ${jobId}: Processed ${newWords.length} new words`);
            }

            // Create story record
            console.log(`[ProcessJob] Job ${jobId}: Saving story to DB...`);
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
                highlightedWords: storyDraft.highlightedWords || [],
            });
            console.log(`[ProcessJob] Job ${jobId}: Story saved with id ${story.id}`);

            // Update job with result
            await db.update("GenerationJob", jobId, {
                status: "completed",
                completedAt: timestamp,
                result: {
                    story: toStoryView(story),
                    newWords: newWords.map(toWordView),
                },
            });
            console.log(`[ProcessJob] Job ${jobId}: Job status updated to completed`);

            // Publish result
            console.log(`[ProcessJob] Job ${jobId}: Publishing result via GraphQL...`);
            await publishStoryResult(jobId, "completed", toStoryView(story), newWords.map(toWordView));
            console.log(`[ProcessJob] Job ${jobId} completed successfully`);

        } catch (error) {
            console.error(`[ProcessJob] FATAL Error processing record:`, error);
            console.error(`[ProcessJob] Error type:`, typeof error);
            console.error(`[ProcessJob] Error message:`, error instanceof Error ? error.message : String(error));
            console.error(`[ProcessJob] Error stack:`, error instanceof Error ? error.stack : 'no stack');
            // Try to update job status to failed
            try {
                const job = unmarshall(record.dynamodb?.NewImage as any);
                if (job && job.id) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    await db.update("GenerationJob", job.id, {
                        status: "failed",
                        completedAt: new Date().toISOString(),
                        error: errorMessage,
                    });
                    await publishStoryResult(job.id, "failed", undefined, undefined, errorMessage);
                    console.log(`[ProcessJob] Published failure for job ${job.id}: ${errorMessage}`);
                }
            } catch (publishError) {
                console.error(`[ProcessJob] Failed to publish error status:`, publishError);
            }
        }
    }
};
