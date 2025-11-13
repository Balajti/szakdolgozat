import type { Schema } from "../../data/resource";
import { getDataClient, unwrapListResult, type GraphQLResult } from "../shared/data-client";

type StoryModel = Schema["Story"]["type"];
type StoryConnection = Schema["listStudentStories"]["returnType"];
type StoryView = Schema["StoryView"]["type"];
type ListResult<T> = GraphQLResult<T[]> & { nextToken?: string | null };

export const handler: Schema["listStudentStories"]["functionHandler"] = async (event) => {
  const { studentId, limit, nextToken } = event.arguments;
  if (!studentId) {
    throw new Error("studentId is required");
  }

  const client = await getDataClient();
  const listResult = (await client.models.Story.list({
    filter: { studentId: { eq: studentId } },
    limit: limit ?? 25,
    nextToken: nextToken ?? undefined,
  })) as ListResult<StoryModel>;

  const { items, nextToken: token } = unwrapListResult<StoryModel>(listResult);
  const stories = (items as StoryModel[]).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  const toStoryView = (story: StoryModel): StoryView => {
    const fallbackTimestamp = new Date().toISOString();

    return {
      id: story.id,
      studentId: story.studentId ?? null,
      teacherId: story.teacherId ?? null,
      title: story.title,
      content: story.content,
      level: story.level,
      createdAt: story.createdAt ?? fallbackTimestamp,
      updatedAt: story.updatedAt ?? story.createdAt ?? fallbackTimestamp,
      mode: story.mode ?? null,
      unknownWordIds: story.unknownWordIds ?? [],
      highlightedWords: story.highlightedWords ?? [],
    };
  };

  const connection: StoryConnection = {
    items: stories.map(toStoryView),
    nextToken: token ?? null,
  };

  return connection;
};
