import type { Schema } from "../../data/resource";
import { getDBClient } from "../shared/dynamodb-client";
import { randomUUID } from "crypto";

type Handler = Schema["createTeacherAssignment"]["functionHandler"];

const DEFAULT_STATUS = "draft";

export const handler: Handler = async (event) => {
  const { teacherId, title, dueDate, level, requiredWords, excludedWords } = event.arguments;
  if (!teacherId || !title || !dueDate || !level) {
    throw new Error("teacherId, title, dueDate, and level are required");
  }

  const db = getDBClient();

  const teacherProfile = await db.get("TeacherProfile", teacherId);
  if (!teacherProfile) {
    throw new Error("Teacher profile not found");
  }

  const assignment = await db.put("Assignment", {
    id: randomUUID(),
    teacherId,
    title,
    dueDate,
    level,
    status: DEFAULT_STATUS,
    requiredWords: requiredWords ?? [],
    excludedWords: excludedWords ?? [],
  });

  return assignment as Schema["Assignment"]["type"];
};
