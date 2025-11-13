import type { Schema } from "../../data/resource";
import { getDataClient, unwrapListResult, unwrapOptionalResult, unwrapResult, type GraphQLResult } from "../shared/data-client";

type TeacherProfileModel = Schema["TeacherProfile"]["type"];
type AssignmentModel = Schema["Assignment"]["type"];
type SubmissionSummaryModel = Schema["SubmissionSummary"]["type"];
type ClassSummaryModel = Schema["ClassSummary"]["type"];
type TeacherDashboardPayload = Schema["getTeacherDashboard"]["returnType"];
type TeacherProfileView = Schema["TeacherProfileView"]["type"];
type AssignmentView = Schema["AssignmentView"]["type"];
type SubmissionSummaryView = Schema["SubmissionSummaryView"]["type"];
type ClassSummaryView = Schema["ClassSummaryView"]["type"];
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

  const fallbackTimestamp = new Date().toISOString();

  const profileView: TeacherProfileView = {
    id: profileRecord.id,
    name: profileRecord.name,
    email: profileRecord.email ?? fallbackTeacherEmail(teacherId),
    school: profileRecord.school ?? null,
    createdAt: profileRecord.createdAt ?? fallbackTimestamp,
    updatedAt: profileRecord.updatedAt ?? profileRecord.createdAt ?? fallbackTimestamp,
  };

  const assignmentsResult = (await client.models.Assignment.list({
    filter: { teacherId: { eq: teacherId } },
    limit: 200,
  })) as ListResult<AssignmentModel>;
  const assignments = (unwrapListResult<AssignmentModel>(assignmentsResult).items as AssignmentModel[]).sort(
    (a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate),
  );

  const assignmentViews: AssignmentView[] = assignments.map((assignment) => {
    const assignmentFallback = new Date().toISOString();

    if (!assignment.teacherId) {
      throw new Error("Assignment record is missing teacherId");
    }

    return {
      id: assignment.id,
      teacherId: assignment.teacherId,
      title: assignment.title,
      dueDate: assignment.dueDate,
      level: assignment.level,
      status: assignment.status,
      requiredWords: assignment.requiredWords ?? [],
      excludedWords: assignment.excludedWords ?? [],
      createdAt: assignment.createdAt ?? assignmentFallback,
      updatedAt: assignment.updatedAt ?? assignment.createdAt ?? assignmentFallback,
    };
  });

  const submissionsResult = (await client.models.SubmissionSummary.list({
    filter: { teacherId: { eq: teacherId } },
    limit: 200,
  })) as ListResult<SubmissionSummaryModel>;
  const submissions = unwrapListResult<SubmissionSummaryModel>(submissionsResult).items as SubmissionSummaryModel[];
  const submissionViews: SubmissionSummaryView[] = submissions.map((submission) => {
    const submissionFallback = new Date().toISOString();

    return {
      id: submission.id,
      assignmentId: submission.assignmentId,
      teacherId: submission.teacherId,
      studentId: submission.studentId,
      studentName: submission.studentName,
      submittedAt: submission.submittedAt,
      score: submission.score ?? null,
      unknownWords: submission.unknownWords ?? [],
      createdAt: submission.createdAt ?? submissionFallback,
      updatedAt: submission.updatedAt ?? submission.createdAt ?? submissionFallback,
    };
  });

  const classesResult = (await client.models.ClassSummary.list({
    filter: { teacherId: { eq: teacherId } },
    limit: 100,
  })) as ListResult<ClassSummaryModel>;
  const classes = unwrapListResult<ClassSummaryModel>(classesResult).items as ClassSummaryModel[];
  const classViews: ClassSummaryView[] = classes.map((classSummary) => {
    const classFallback = new Date().toISOString();

    return {
      id: classSummary.id,
      teacherId: classSummary.teacherId,
      name: classSummary.name,
      studentCount: classSummary.studentCount,
      averageLevel: classSummary.averageLevel,
      completionRate: classSummary.completionRate,
      mostChallengingWord: classSummary.mostChallengingWord ?? null,
      createdAt: classSummary.createdAt ?? classFallback,
      updatedAt: classSummary.updatedAt ?? classSummary.createdAt ?? classFallback,
    };
  });

  const payload: TeacherDashboardPayload = {
    profile: profileView,
    assignments: assignmentViews,
    submissions: submissionViews,
    classes: classViews,
  };

  return payload;
};
