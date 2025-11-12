import type { Schema } from "../../data/resource";
import { getDataClient, unwrapListResult, type GraphQLResult } from "../shared/data-client";

type AssignmentModel = Schema["Assignment"]["type"];
type ListResult<T> = GraphQLResult<T[]> & { nextToken?: string | null };

type Handler = Schema["listAssignments"]["functionHandler"];

export const handler: Handler = async (event) => {
  const { teacherId } = event.arguments;
  if (!teacherId) {
    throw new Error("teacherId is required");
  }

  const client = await getDataClient();
  const assignmentsResult = (await client.models.Assignment.list({
    filter: { teacherId: { eq: teacherId } },
    limit: 200,
  })) as ListResult<AssignmentModel>;

  const assignments = unwrapListResult<AssignmentModel>(assignmentsResult).items as AssignmentModel[];
  return assignments.sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate));
};
