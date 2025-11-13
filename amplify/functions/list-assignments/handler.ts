import type { Schema } from "../../data/resource";
import { getDataClient, unwrapListResult, type GraphQLResult } from "../shared/data-client";

type AssignmentModel = Schema["Assignment"]["type"];
type AssignmentView = Schema["AssignmentView"]["type"];
type ListResult<T> = GraphQLResult<T[]> & { nextToken?: string | null };

type Handler = Schema["listTeacherAssignments"]["functionHandler"];

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
  const sorted = assignments.sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate));

  const toAssignmentView = (assignment: AssignmentModel): AssignmentView => {
    const teacherIdValue = assignment.teacherId;
    if (!teacherIdValue) {
      throw new Error("Assignment record is missing teacherId");
    }

    return {
      id: assignment.id,
      teacherId: teacherIdValue,
      title: assignment.title,
      dueDate: assignment.dueDate,
      level: assignment.level,
      status: assignment.status,
      requiredWords: assignment.requiredWords ?? [],
      excludedWords: assignment.excludedWords ?? [],
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  };

  return sorted.map(toAssignmentView);
};
