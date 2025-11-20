import { randomUUID } from "node:crypto";
import type { AppSyncIdentityCognito } from "aws-lambda";
import { GoogleGenerativeAI } from "@google/generative-ai";
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
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const { level, age, knownWords, unknownWords, requiredWords, excludedWords, mode } = input;
  
  // Build vocabulary constraints
  const targetWords = [...new Set([...unknownWords, ...requiredWords])];
  const avoidWords = excludedWords.length > 0 ? excludedWords : [];
  
  // Create age-appropriate context
  const ageContext = age <= 10 
    ? "a young child who loves adventures, animals, and fantasy"
    : age <= 14
    ? "a pre-teen interested in friendship, school life, and discovery"
    : "a teenager curious about real-world issues, technology, and personal growth";

  const modeContext = mode === "placement"
    ? "This is a placement test story to assess vocabulary level."
    : mode === "teacher"
    ? "This is a teacher-assigned story for classroom learning."
    : "This is a personalized story matching the student's interests and vocabulary.";

  const prompt = `You are an expert English language teacher creating an engaging story for a ${age}-year-old student at CEFR level ${level}.

${modeContext}

**Requirements:**
- Target audience: ${ageContext}
- CEFR Level: ${level}
- Story length: 200-300 words
- Must naturally include these target words: ${targetWords.join(", ")}
- Can use these known words: ${knownWords.slice(0, 30).join(", ")}${knownWords.length > 30 ? ` (and ${knownWords.length - 30} more)` : ""}
${avoidWords.length > 0 ? `- AVOID these words: ${avoidWords.join(", ")}` : ""}

**Story Guidelines:**
- Create an engaging narrative with a clear beginning, middle, and end
- Use simple sentence structures appropriate for ${level} level
- Make the story interesting and age-appropriate for a ${age}-year-old
- Naturally weave target words into the story context
- Include dialogue if appropriate
- End with a positive or thought-provoking conclusion

**Format your response as JSON:**
{
  "title": "Engaging story title (5-7 words)",
  "content": "The complete story text with proper paragraphs",
  "highlightedWords": [
    {"word": "target word from the story", "offset": character_position, "length": word_length}
  ]
}

Important: In highlightedWords, only include the NEW/UNKNOWN words (${targetWords.join(", ")}). Find their exact positions in the content text.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Extract JSON from response (remove markdown code blocks if present)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from AI response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as GeneratedStory;
    
    // Validate response structure
    if (!parsed.title || !parsed.content) {
      throw new Error("Invalid story structure from AI");
    }
    
    // Ensure highlightedWords is an array
    if (!Array.isArray(parsed.highlightedWords)) {
      parsed.highlightedWords = [];
    }
    
    return parsed;
  } catch (error) {
    console.error("Gemini API error:", error);
    // Fallback to simple story if AI fails
    return generateFallbackStory(input);
  }
}

function generateFallbackStory(input: SanitizedInput): GeneratedStory {
  const { level, unknownWords, requiredWords } = input;
  const targetWords = [...new Set([...unknownWords, ...requiredWords])];
  
  const title = `Learning Adventure (${level})`;
  const content = `Once upon a time, there was a curious learner who loved discovering new words.

Every day, they practiced English by reading stories and talking with friends. They learned that ${targetWords.slice(0, 3).join(", ")} ${targetWords.length > 3 ? "and many other words" : ""} could help them express amazing ideas.

With patience and practice, the learner grew more confident. They realized that every new word was like a key, unlocking new ways to communicate and understand the world.

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

  const storyDraft = await generateStoryWithAI(sanitized);
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
    highlightedWords: storyDraft.highlightedWords || [],
  });

  const payload: StoryGenerationPayload = {
    story: toStoryView(story),
    newWords: newWords.map(toWordView),
  };

  return payload;
};
