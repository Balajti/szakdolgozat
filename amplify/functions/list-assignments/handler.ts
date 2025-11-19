import type { Schema } from "../../data/resource";
import { queryByIndex, type DynamoDBItem } from "../shared/dynamodb-client";

type AssignmentView = Schema["AssignmentView"]["type"];
type Handler = Schema["listTeacherAssignments"]["functionHandler"];

export const handler: Handler = async (event) => {
  const { teacherId } = event.arguments;
  if (!teacherId) {
    throw new Error("teacherId is required");
  }

  const assignments = await queryByIndex("Assignment", "byTeacherId", "teacherId", teacherId, 200);
  const sorted = assignments.sort((a, b) => Date.parse(String(a.dueDate)) - Date.parse(String(b.dueDate)));

  const toAssignmentView = (assignment: DynamoDBItem): AssignmentView => {
    const teacherIdValue = assignment.teacherId;
    if (!teacherIdValue) {
      throw new Error("Assignment record is missing teacherId");
    }

    return {
      id: String(assignment.id),
      teacherId: String(teacherIdValue),
      title: String(assignment.title),
      dueDate: String(assignment.dueDate),
      level: String(assignment.level),
      status: String(assignment.status) as "draft" | "sent" | "submitted" | "graded",
      requiredWords: Array.isArray(assignment.requiredWords) ? assignment.requiredWords.map(String) : [],
      excludedWords: Array.isArray(assignment.excludedWords) ? assignment.excludedWords.map(String) : [],
      createdAt: String(assignment.createdAt),
      updatedAt: String(assignment.updatedAt),
    };
  };

  return sorted.map(toAssignmentView);
};
