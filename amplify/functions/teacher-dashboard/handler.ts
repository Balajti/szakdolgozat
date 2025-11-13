import type { Schema } from "../../data/resource";
import { getDataClient, unwrapListResult, unwrapOptionalResult, unwrapResult, type GraphQLResult } from "../shared/data-client";

type TeacherProfileModel = Schema["TeacherProfile"]["type"];
type AssignmentModel = Schema["Assignment"]["type"];
type SubmissionSummaryModel = Schema["SubmissionSummary"]["type"];
type ClassSummaryModel = Schema["ClassSummary"]["type"];
type TeacherDashboardPayload = Schema["getTeacherDashboard"]["returnType"];
type ListResult<T> = GraphQLResult<T[]> & { nextToken?: string | null };

function fallbackTeacherEmail(id: string): string {
  return `${id}@teachers.wordnest.local`;
}

export const handler: Schema["getTeacherDashboard"]["functionHandler"] = async (event) => {
  const { id } = event.arguments;
  if (!id) {
    throw new Error("Teacher identifier is required");
  }

  const teacherId = id as string;
  const client = await getDataClient();

  const profileResult = (await client.models.TeacherProfile.get({ id: teacherId })) as GraphQLResult<TeacherProfileModel>;
  const existingProfile = unwrapOptionalResult<TeacherProfileModel>(profileResult);

  let profileRecord: TeacherProfileModel = existingProfile
    ?? unwrapResult<TeacherProfileModel>(
      await client.models.TeacherProfile.create({
        id: teacherId,
        name: "New Teacher",
        email: fallbackTeacherEmail(teacherId),
      }),
      "Failed to create teacher profile",
    );

  if (!profileRecord.email) {
    profileRecord = unwrapResult<TeacherProfileModel>(
      await client.models.TeacherProfile.update({
        id: teacherId,
        email: fallbackTeacherEmail(teacherId),
      }),
      "Failed to backfill teacher email",
    );
  }

  const normalizedProfile: TeacherProfileModel = {
    ...profileRecord,
    email: profileRecord.email ?? fallbackTeacherEmail(teacherId),
    school: profileRecord.school ?? null,
  };

  const assignmentsResult = (await client.models.Assignment.list({
    filter: { teacherId: { eq: teacherId } },
    limit: 200,
  })) as ListResult<AssignmentModel>;
  const assignments = (unwrapListResult<AssignmentModel>(assignmentsResult).items as AssignmentModel[]).sort(
    (a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate),
  );

  const submissionsResult = (await client.models.SubmissionSummary.list({
    filter: { teacherId: { eq: teacherId } },
    limit: 200,
  })) as ListResult<SubmissionSummaryModel>;
  const submissions = unwrapListResult<SubmissionSummaryModel>(submissionsResult).items as SubmissionSummaryModel[];

  const classesResult = (await client.models.ClassSummary.list({
    filter: { teacherId: { eq: teacherId } },
    limit: 100,
  })) as ListResult<ClassSummaryModel>;
  const classes = unwrapListResult<ClassSummaryModel>(classesResult).items as ClassSummaryModel[];

  const payload: TeacherDashboardPayload = {
    profile: normalizedProfile,
    assignments,
    submissions,
    classes,
  };

  return payload;
};
