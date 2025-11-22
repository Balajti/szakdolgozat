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
    : "an adult or young adult interested in engaging, mature storytelling, life experiences, and interesting scenarios";

  const modeContext = mode === "placement"
    ? "This is a placement test story to assess vocabulary level."
    : mode === "teacher"
    ? "This is a teacher-assigned story for classroom learning."
    : "This is a personalized story for enjoyment and immersion.";

  const prompt = `You are a creative storyteller writing a captivating bedtime story for a ${age}-year-old reader at CEFR level ${level}.

${modeContext}

**Requirements:**
- Target audience: ${ageContext}
- CEFR Level: ${level}
- Story length: 1000 words (MINIMUM 1000 words - this is critical for immersion)
- Must naturally include these target words multiple times: ${targetWords.join(", ")}
- Repeat each target word 2-3 times throughout the story in different contexts
- Can use these known words: ${knownWords.slice(0, 30).join(", ")}${knownWords.length > 30 ? ` (and ${knownWords.length - 30} more)` : ""}
${avoidWords.length > 0 ? `- AVOID these words: ${avoidWords.join(", ")}` : ""}

**Story Guidelines:**
- **Style:** Bedtime story / Fiction. NOT an educational text or lesson.
- **Scenario:** Choose a completely RANDOM and CREATIVE scenario (e.g., sci-fi, mystery, fantasy, slice of life, historical). Do not default to "learning English" or "school" themes unless requested.
- **Tone:** Relaxing, engaging, and immersive.
- **Structure:** Create a rich narrative with a clear beginning, middle, and end.
- **Age Appropriateness:** 
    - If the user is an adult (>18), write a mature, interesting story suitable for adults (not explicit, but not childish).
    - If the user is a child, keep it whimsical and fun.
- **Vocabulary:** Naturally weave target words into the story context. Do not force them.
- **Length:** You MUST write at least 1000 words. Expand on descriptions, dialogue, and setting to achieve this.

**Format your response as JSON:**
{
  "title": "Engaging story title (5-7 words)",
  "content": "The complete story text with proper paragraphs (MINIMUM 400 words)",
  "highlightedWords": [
    {"word": "target word from the story", "offset": character_position, "length": word_length}
  ]
}

Important: 
1. The story MUST be at least 400 words long
2. In highlightedWords, include ALL occurrences of the NEW/UNKNOWN words (${targetWords.join(", ")})
3. Find their exact positions in the content text for each occurrence`;

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
