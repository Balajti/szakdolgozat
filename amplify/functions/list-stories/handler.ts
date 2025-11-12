import type { Schema } from "../../data/resource";
import { getDataClient, unwrapListResult, type GraphQLResult } from "../shared/data-client";

type StoryModel = Schema["Story"]["type"];
type StoryConnection = Schema["listStories"]["returnType"];
type ListResult<T> = GraphQLResult<T[]> & { nextToken?: string | null };

export const handler: Schema["listStories"]["functionHandler"] = async (event) => {
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

  const connection: StoryConnection = {
    items: stories,
    nextToken: token ?? null,
  };

  return connection;
};
