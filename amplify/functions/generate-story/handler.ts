import { randomUUID } from "node:crypto";
import type { AppSyncIdentityCognito, AppSyncResolverEvent } from "aws-lambda";
import { GoogleGenAI } from "@google/genai";
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
  topic?: string;
  difficulty?: string;
};

interface GeneratedStory {
  title: string;
  content: string;
  highlightedWords: Array<{ word: string; offset: number; length: number }>;
}

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

async function generateStoryWithAI(input: SanitizedInput): Promise<GeneratedStory> {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("API Key exists:", !!apiKey, "Length:", apiKey?.length || 0);

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  console.log("Gemini client initialized, generating story...");

  const { level, age, knownWords, unknownWords, requiredWords, excludedWords, mode } = input;

  // Build vocabulary constraints
  const targetWords = [...new Set([...unknownWords, ...requiredWords])];
  const avoidWords = excludedWords.length > 0 ? excludedWords : [];

  // Create age-appropriate context
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

  // Reduced word count to 1000 - optimized for 1.5-flash speed within 30s limit
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
- Can use these known words: ${knownWords.slice(0, 30).join(", ")}${knownWords.length > 30 ? ` (and ${knownWords.length - 30} more)` : ""}
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
    console.log("Calling Gemini API with model: gemini-1.5-flash");
    const startTime = Date.now();

    // Create a timeout promise that rejects after 28.5 seconds (leaving 1.5s buffer for AppSync 30s limit)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("AI generation timed out")), 28500);
    });

    const generationPromise = ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 1.0,
        topP: 0.95,
        topK: 40,
      },
    });

    // Race against the timeout
    const response = await Promise.race([generationPromise, timeoutPromise]);

    const elapsed = Date.now() - startTime;
    console.log(`Gemini API response received in ${elapsed}ms`);

    const text = response.text;
    if (!text) {
      throw new Error("No text received from AI response");
    }

    console.log("Response text length:", text.length);

    // Extract JSON from response (remove markdown code blocks if present)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to extract JSON from response:", text.substring(0, 200));
      throw new Error("Failed to parse JSON from AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedStory;

    // Validate response structure
    if (!parsed.title || !parsed.content) {
      throw new Error("Invalid story structure from AI");
    }

    console.log("Story generated successfully:", parsed.title);

    // Ensure highlightedWords is an array
    if (!Array.isArray(parsed.highlightedWords)) {
      parsed.highlightedWords = [];
    }

    return parsed;
  } catch (error) {
    console.error("Gemini API error details:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    // Fallback to simple story if AI fails or times out
    console.log("Using fallback story generation due to error/timeout");
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

  // Calculate positions for highlighted words
  const highlightedWords = targetWords.map(word => {
    const offset = content.indexOf(word);
    return offset >= 0 ? { word, offset, length: word.length } : null;
  }).filter((h): h is { word: string; offset: number; length: number } => h !== null);

  return { title, content, highlightedWords };
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
  const handlerStartTime = Date.now();
  console.log("[TIMING] Handler started at:", new Date().toISOString());

  const appSyncEvent = event as AppSyncResolverEvent<any>;
  const { level, age, mode, knownWords, unknownWords, requiredWords, excludedWords, topic, customWords, difficulty } = appSyncEvent.arguments as {
    level: string;
    age?: number | null;
    mode: GenerationMode;
    knownWords?: (string | null | undefined)[] | null;
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
    knownWords: normalizeWordList(knownWords),
    unknownWords: normalizeWordList(unknownWords),
    requiredWords: normalizeWordList(allRequiredWords),
    excludedWords: normalizeWordList(excludedWords),
    topic: topic?.trim() || undefined,
    difficulty: difficulty?.trim() || undefined,
  };

  const ownership = resolveOwner(event, sanitized.mode);
  const db = getDBClient();

  console.log("[TIMING] Pre-processing completed in:", Date.now() - handlerStartTime, "ms");

  // Ensure student profile exists
  if (ownership.studentId) {
    const profileCheckStart = Date.now();
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
    console.log("[TIMING] Profile check completed in:", Date.now() - profileCheckStart, "ms");
  }

  // Generate story with AI
  const aiStartTime = Date.now();
  console.log("[TIMING] Starting AI story generation...");
  const storyDraft = await generateStoryWithAI(sanitized);
  const aiElapsed = Date.now() - aiStartTime;
  console.log("[TIMING] AI generation completed in:", aiElapsed, "ms");
  console.log("[TIMING] Total elapsed so far:", Date.now() - handlerStartTime, "ms");

  const timestamp = new Date().toISOString();

  const newWords: DynamoDBItem[] = [];
  const unknownWordIds: string[] = [];

  // Process words for student
  if (ownership.studentId) {
    const wordProcessingStart = Date.now();

    // Query existing words once
    const existingWords = await queryByIndex("Word", "byStudentId", "studentId", ownership.studentId, 500);
    const byText = new Map(existingWords.map((word) => [String(word.text).toLowerCase(), word]));
    console.log("[TIMING] Existing words loaded in:", Date.now() - wordProcessingStart, "ms");

    // Process unknown words
    const wordCreationStart = Date.now();
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
    console.log("[TIMING] Word creation completed in:", Date.now() - wordCreationStart, "ms");

    // Update vocabulary count using already loaded words
    const masteredCount = existingWords.filter((word) => word.mastery !== "unknown").length + newWords.filter(w => w.mastery !== "unknown").length;

    const profileUpdateStart = Date.now();
    const profile = await db.get("StudentProfile", ownership.studentId);
    if (profile && Number(profile.vocabularyCount) !== masteredCount) {
      await db.update("StudentProfile", ownership.studentId, {
        vocabularyCount: masteredCount,
      });
    }
    console.log("[TIMING] Profile update completed in:", Date.now() - profileUpdateStart, "ms");
    console.log("[TIMING] Total word processing time:", Date.now() - wordProcessingStart, "ms");
  }

  // Create story record
  const storyCreationStart = Date.now();
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
  console.log("[TIMING] Story creation completed in:", Date.now() - storyCreationStart, "ms");

  // Build response
  const responseStart = Date.now();
  const payload: StoryGenerationPayload = {
    story: toStoryView(story),
    newWords: newWords.map(toWordView),
  };
  console.log("[TIMING] Response payload built in:", Date.now() - responseStart, "ms");

  const totalElapsed = Date.now() - handlerStartTime;
  console.log("[TIMING] ✅ TOTAL HANDLER EXECUTION TIME:", totalElapsed, "ms");

  if (totalElapsed > 150000) { // 2.5 minutes
    console.warn("[WARNING] Handler execution time approaching timeout limit!");
  }

  return payload;
};
