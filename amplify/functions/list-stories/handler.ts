import type { Schema } from "../../data/resource";
import { queryByIndex, type DynamoDBItem } from "../shared/dynamodb-client";

type StoryConnection = Schema["listStudentStories"]["returnType"];
type StoryView = Schema["StoryView"]["type"];

export const handler: Schema["listStudentStories"]["functionHandler"] = async (event) => {
  const { studentId, limit } = event.arguments;
  if (!studentId) {
    throw new Error("studentId is required");
  }

  const stories = await queryByIndex("Story", "byStudentId", "studentId", studentId, limit ?? 25);
  const sortedStories = stories.sort(
    (a, b) => Date.parse(String(b.createdAt)) - Date.parse(String(a.createdAt))
  );

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
      mode: story.mode ? (String(story.mode) as "placement" | "personalized" | "teacher") : null,
      unknownWordIds: Array.isArray(story.unknownWordIds) ? story.unknownWordIds.map(String) : [],
      highlightedWords: Array.isArray(story.highlightedWords) ? story.highlightedWords : [],
    };
  };

  const connection: StoryConnection = {
    items: sortedStories.map(toStoryView),
    nextToken: null,
  };

  return connection;
};
