import type { Schema } from "../../data/resource";
import { getDataClient, unwrapOptionalResult, unwrapResult, type GraphQLResult } from "../shared/data-client";

type AssignmentModel = Schema["Assignment"]["type"];
type TeacherProfileModel = Schema["TeacherProfile"]["type"];

type Handler = Schema["createTeacherAssignment"]["functionHandler"];

const DEFAULT_STATUS: AssignmentModel["status"] = "draft";

export const handler: Handler = async (event) => {
  const { input } = event.arguments;
  if (!input) {
    throw new Error("input is required");
  }

  const { teacherId, title, dueDate, level, requiredWords, excludedWords } = input;
  if (!teacherId || !title || !dueDate || !level) {
    throw new Error("teacherId, title, dueDate, and level are required");
  }

  const client = await getDataClient();

  const teacherProfileResult = (await client.models.TeacherProfile.get({ id: teacherId })) as GraphQLResult<TeacherProfileModel>;
  const teacherProfile = unwrapOptionalResult<TeacherProfileModel>(teacherProfileResult);
  if (!teacherProfile) {
    throw new Error("Teacher profile not found");
  }

  const assignment = unwrapResult<AssignmentModel>(
    (await client.models.Assignment.create({
      teacherId,
      title,
      dueDate,
      level,
      status: DEFAULT_STATUS,
      requiredWords: requiredWords ?? [],
      excludedWords: excludedWords ?? [],
      createdAt: new Date().toISOString(),
    })) as GraphQLResult<AssignmentModel>,
    "Failed to create assignment",
  );

  return assignment;
};
