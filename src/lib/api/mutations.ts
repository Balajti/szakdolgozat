import { generateClient } from "aws-amplify/api";

import { ensureAmplifyConfigured } from "@/lib/api/config";
import { generateStoryMutation, updateWordMasteryMutation } from "@/lib/graphql/mutations";
import { mockStudentProfile, mockWords } from "@/lib/mock-data";
import type { Story, Word } from "@/lib/types";

type FetchMode = "mock" | "amplify";
const fetchMode: FetchMode = (process.env.NEXT_PUBLIC_WORDNEST_API_MODE as FetchMode | undefined) ?? "amplify";

const client = () => {
  ensureAmplifyConfigured();
  return generateClient({});
};

export interface UpdateWordMasteryArgs {
  studentId: string;
  wordId: string;
  mastery: Word["mastery"];
}

export async function updateWordMastery({ studentId, wordId, mastery }: UpdateWordMasteryArgs): Promise<Word> {
  if (fetchMode === "mock") {
    // Return updated mock word
    const word = mockWords.find((w) => w.id === wordId);
    if (!word) throw new Error("Word not found in mock data");
    return { ...word, mastery, lastReviewedAt: new Date().toISOString() };
  }

  const gql = client();
  type UpdateWordMasteryResult = { updateWordMastery: Word };
  const response = await gql.graphql<UpdateWordMasteryResult>({
    query: updateWordMasteryMutation,
    variables: { studentId, wordId, mastery },
  });

  if (!response || !("data" in response) || !response.data) {
    throw new Error("Missing data in updateWordMastery response");
  }
  return response.data.updateWordMastery;
}

export interface GenerateStoryArgs {
  level: string;
  age: number;
  knownWords: string[];
  unknownWords: string[];
  requiredWords?: string[];
  excludedWords?: string[];
  mode: "placement" | "personalized" | "teacher";
}

export interface GenerateStoryResult {
  story: Story;
  newWords: Word[];
  source: FetchMode;
}

export async function generateStory(args: GenerateStoryArgs): Promise<GenerateStoryResult> {
  if (fetchMode === "mock") {
    // Simple local synthesis mirroring existing student portal logic
    const wordsPool = mockStudentProfile.words;
    const now = new Date();
    const story: Story = {
      id: `local-${now.getTime()}`,
      studentId: mockStudentProfile.id,
      teacherId: null,
      title: `AI Story (${args.mode})`,
      content: `This is a locally generated mock story for ${args.level} level containing ${wordsPool.length} words to practice.`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      level: args.level,
      mode: args.mode,
      unknownWordIds: wordsPool.filter((w) => w.mastery !== "known").map((w) => w.id),
      highlightedWords: [],
    };
    return { story, newWords: [], source: "mock" };
  }

  const gql = client();
  type GenerateStoryResult = { generateStory: { story: Story; newWords: Word[] } };
  const { level, age, knownWords, unknownWords, requiredWords, excludedWords, mode } = args;
  const response = await gql.graphql<GenerateStoryResult>({
    query: generateStoryMutation,
    variables: { level, age, knownWords, unknownWords, requiredWords, excludedWords, mode },
  });
  if (!response || !("data" in response) || !response.data) {
    throw new Error("Missing data in generateStory response");
  }
  const payload = response.data.generateStory;
  return { story: payload.story, newWords: payload.newWords, source: "amplify" };
}
