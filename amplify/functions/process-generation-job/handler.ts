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

async function generateStoryWithAI(input: SanitizedInput): Promise<GeneratedStory> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY environment variable not set");

    const ai = new GoogleGenAI({ apiKey });
    const { level, age, unknownWords, requiredWords, excludedWords, mode } = input;

    const targetWords = [...new Set([...unknownWords, ...requiredWords])];
    const avoidWords = excludedWords.length > 0 ? excludedWords : [];

    const ageContext = age <= 10
        ? "a young child who loves adventures, animals, and fantasy"
        : age <= 14
            ? "a pre-teen interested in friendship, school life, and discovery"
            : "an adult or young adult interested in engaging, mature storytelling, life experiences, and interesting scenarios";

    const modeContext = mode === "placement"
        ? "This is a placement test story to assess vocabulary level."
        : mode === "teacher"
            ? "This is a teacher-assigned story for classroom learning."
            : "This is a personalized story for enjoyment and immersion.";

    const topicPrompt = input.topic
        ? `Topic: Write a story specifically about "${input.topic}".`
        : "Scenario: Choose a completely RANDOM and CREATIVE scenario (e.g., sci-fi, mystery, fantasy, slice of life, historical).";

    const difficultyHint = input.difficulty === "beginner"
        ? "Keep vocabulary simple and sentence structures straightforward. Use common, everyday words."
        : input.difficulty === "intermediate"
            ? "Use moderately complex vocabulary and varied sentence structures. Include some idiomatic expressions."
            : input.difficulty === "advanced"
                ? "Feel free to use sophisticated vocabulary, complex sentence structures, and nuanced language."
                : "Adjust vocabulary naturally for the CEFR level.";

    const prompt = `You are a creative storyteller writing a captivating bedtime story for a ${age}-year-old reader at CEFR level ${level}.

${modeContext}
${topicPrompt}
${difficultyHint}

**Requirements:**
- Target audience: ${ageContext}
- CEFR Level: ${level}
- Story length: ~1000 words (Keep it concise but engaging)
- Must naturally include these target words multiple times: ${targetWords.join(", ")}
- Repeat each target word 2-3 times throughout the story in different contexts

${avoidWords.length > 0 ? `- AVOID these words: ${avoidWords.join(", ")}` : ""}

**Story Guidelines:**
- **Style:** Bedtime story / Fiction. NOT an educational text or lesson.
- **Scenario:** ${input.topic ? `Focus strictly on the requested topic: "${input.topic}".` : "Be creative and unique."}
- **Tone:** Relaxing, engaging, and immersive.
- **Structure:** Create a rich narrative with a clear beginning, middle, and end.
- **Age Appropriateness:**
    - If the user is an adult (>18), write a mature, interesting story suitable for adults.
    - If the user is a child, keep it whimsical and fun.
- **Vocabulary:** Naturally weave target words into the story context. Do not force them.
- **Length:** Aim for ~1000 words.

**Format your response as JSON:**
{
  "title": "Engaging story title (5-7 words)",
  "content": "The complete story text with proper paragraphs",
  "highlightedWords": [
    {"word": "target word from the story", "offset": character_position, "length": word_length}
  ]
}

Important:
1. In highlightedWords, include ALL occurrences of the NEW/UNKNOWN words (${targetWords.join(", ")})
2. Find their exact positions in the content text for each occurrence
3. DO NOT use markdown formatting (**, *, etc.) in the story content - write plain text only`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 1.0,
                topP: 0.95,
                topK: 40,
            },
        });

        const text = response.text;
        if (!text) throw new Error("No text received from AI response");

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Failed to parse JSON from AI response");

        const parsed = JSON.parse(jsonMatch[0]) as GeneratedStory;
        if (!parsed.title || !parsed.content) throw new Error("Invalid story structure from AI");

        if (!Array.isArray(parsed.highlightedWords)) {
            parsed.highlightedWords = [];
        }

        return parsed;
    } catch (error) {
        console.error("Gemini API error:", error);
        return generateFallbackStory(input);
    }
}

function generateFallbackStory(input: SanitizedInput): GeneratedStory {
    const { level, unknownWords, requiredWords } = input;
    const targetWords = [...new Set([...unknownWords, ...requiredWords])];

    const title = `Learning Adventure (${level})`;
    const content = `Once upon a time, there was a curious learner who loved discovering new words and improving their English skills every single day.

Every morning, they would wake up excited to practice. They knew that learning ${targetWords.slice(0, 3).join(", ")} ${targetWords.length > 3 ? "and many other words" : ""} would help them communicate better. The learner understood that each word had its own special meaning and purpose.

During the day, they would read books, listen to stories, and talk with friends. When they encountered ${targetWords[0] || "new words"}, they would write them down in a special notebook. This notebook became their treasure chest of vocabulary.

The learner discovered that using ${targetWords[1] || "these words"} in sentences made them easier to remember. They practiced speaking aloud, creating their own stories, and sharing them with others. Sometimes the stories were funny, and sometimes they were serious, but they were always interesting.

As weeks passed, the learner noticed something wonderful. The words that once seemed difficult, like ${targetWords[2] || "challenging vocabulary"}, now felt natural. They could use them without thinking too hard. This progress made them feel proud and motivated to continue learning.

Their teacher was impressed with how much they had improved. Their friends enjoyed listening to their stories. The learner realized that patience and daily practice were the keys to success. Every new word was like a stepping stone, helping them reach new heights in their language journey.

With confidence growing stronger each day, the learner looked forward to discovering even more words and becoming an excellent English speaker.

The end.`;

    const highlightedWords = targetWords.map(word => {
        const offset = content.indexOf(word);
        return offset >= 0 ? { word, offset, length: word.length } : null;
    }).filter((h): h is { word: string; offset: number; length: number } => h !== null);

    return { title, content, highlightedWords };
    return { title, content, highlightedWords };
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

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            temperature: 0.7,
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
            // In a real scenario, we might want to store ownership explicitly in the job
            // For now, assuming studentId = userId if mode != teacher
            const ownership = sanitized.mode === "teacher"
                ? { teacherId: userId }
                : { studentId: userId };

            // Update job status to processing
            await db.update("GenerationJob", jobId, { status: "processing" });

            // Ensure student profile exists if student
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

            // Generate story
            const storyDraft = await generateStoryWithAI(sanitized);
            const timestamp = new Date().toISOString();
            const newWords: DynamoDBItem[] = [];
            const unknownWordIds: string[] = [];

            // Process words for student
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

                const masteredCount = existingWords.filter((word) => word.mastery !== "unknown").length + newWords.filter(w => w.mastery !== "unknown").length;
                const profile = await db.get("StudentProfile", ownership.studentId);
                if (profile && Number(profile.vocabularyCount) !== masteredCount) {
                    await db.update("StudentProfile", ownership.studentId, { vocabularyCount: masteredCount });
                }
            }

            // Create story record
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

            // Update job with result
            await db.update("GenerationJob", jobId, {
                status: "completed",
                completedAt: timestamp,
                result: {
                    story: toStoryView(story),
                    newWords: newWords.map(toWordView),
                },
            });

            // Publish result
            await publishStoryResult(jobId, "completed", toStoryView(story), newWords.map(toWordView));
            console.log(`[ProcessJob] Job ${jobId} completed successfully`);

        } catch (error) {
            console.error(`[ProcessJob] Error processing record:`, error);
            // Try to update job status to failed if we have a jobId
            // But here we are inside the loop, so we might not have jobId easily accessible if parsing failed
            // Assuming parsing succeeded:
            const job = unmarshall(record.dynamodb?.NewImage as any);
            if (job && job.id) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                await db.update("GenerationJob", job.id, {
                    status: "failed",
                    completedAt: new Date().toISOString(),
                    error: errorMessage,
                });
                await publishStoryResult(job.id, "failed", undefined, undefined, errorMessage);
            }
        }
    }
};
