import type { Schema } from "../../data/resource";
import { getDBClient, queryByIndex } from "../shared/dynamodb-client";

type TeacherDashboardPayload = Schema["getTeacherDashboard"]["returnType"];
type TeacherProfileView = Schema["TeacherProfileView"]["type"];
type AssignmentView = Schema["AssignmentView"]["type"];
type SubmissionSummaryView = Schema["SubmissionSummaryView"]["type"];
type ClassSummaryView = Schema["ClassSummaryView"]["type"];

function fallbackTeacherEmail(id: string): string {
  return `${id}@teachers.wordnest.local`;
}

export const handler: Schema["getTeacherDashboard"]["functionHandler"] = async (event) => {
  const { id } = event.arguments;
  if (!id) {
    throw new Error("Teacher identifier is required");
  }

  const teacherId = id as string;
  const db = getDBClient();

  let profileRecord = await db.get("TeacherProfile", teacherId);
  
  if (!profileRecord) {
    profileRecord = await db.put("TeacherProfile", {
      id: teacherId,
      name: "New Teacher",
      email: fallbackTeacherEmail(teacherId),
    });
  }

  if (!profileRecord.email) {
    profileRecord = await db.update("TeacherProfile", teacherId, {
      email: fallbackTeacherEmail(teacherId),
    });
  }

  const fallbackTimestamp = new Date().toISOString();

  const profileView: TeacherProfileView = {
    id: String(profileRecord.id),
    name: String(profileRecord.name),
    email: String(profileRecord.email ?? fallbackTeacherEmail(teacherId)),
    school: profileRecord.school ? String(profileRecord.school) : null,
    createdAt: String(profileRecord.createdAt ?? fallbackTimestamp),
    updatedAt: String(profileRecord.updatedAt ?? profileRecord.createdAt ?? fallbackTimestamp),
  };

  const assignments = await queryByIndex("Assignment", "byTeacherId", "teacherId", teacherId, 200);
  const sortedAssignments = assignments.sort((a, b) => Date.parse(String(a.dueDate)) - Date.parse(String(b.dueDate)));

  const assignmentViews: AssignmentView[] = sortedAssignments.map((assignment) => {
    const assignmentFallback = new Date().toISOString();

    if (!assignment.teacherId) {
      throw new Error("Assignment record is missing teacherId");
    }

    return {
      id: String(assignment.id),
      teacherId: String(assignment.teacherId),
      title: String(assignment.title),
      dueDate: String(assignment.dueDate),
      level: String(assignment.level),
      status: String(assignment.status) as "draft" | "sent" | "submitted" | "graded",
      requiredWords: Array.isArray(assignment.requiredWords) ? assignment.requiredWords.map(String) : [],
      excludedWords: Array.isArray(assignment.excludedWords) ? assignment.excludedWords.map(String) : [],
      createdAt: String(assignment.createdAt ?? assignmentFallback),
      updatedAt: String(assignment.updatedAt ?? assignment.createdAt ?? assignmentFallback),
    };
  });

  const submissions = await queryByIndex("SubmissionSummary", "byTeacherId", "teacherId", teacherId, 200);
  const submissionViews: SubmissionSummaryView[] = submissions.map((submission) => {
    const submissionFallback = new Date().toISOString();

    return {
      id: String(submission.id),
      assignmentId: String(submission.assignmentId),
      teacherId: String(submission.teacherId),
      studentId: String(submission.studentId),
      studentName: String(submission.studentName),
      submittedAt: String(submission.submittedAt),
      score: submission.score ? Number(submission.score) : null,
      unknownWords: Array.isArray(submission.unknownWords) ? submission.unknownWords.map(String) : [],
      createdAt: String(submission.createdAt ?? submissionFallback),
      updatedAt: String(submission.updatedAt ?? submission.createdAt ?? submissionFallback),
    };
  });

  const classes = await queryByIndex("ClassSummary", "byTeacherId", "teacherId", teacherId, 100);
  const classViews: ClassSummaryView[] = classes.map((classSummary) => {
    const classFallback = new Date().toISOString();

    return {
      id: String(classSummary.id),
      teacherId: String(classSummary.teacherId),
      name: String(classSummary.name),
      studentCount: Number(classSummary.studentCount),
      averageLevel: String(classSummary.averageLevel),
      completionRate: Number(classSummary.completionRate),
      mostChallengingWord: classSummary.mostChallengingWord ? String(classSummary.mostChallengingWord) : null,
      createdAt: String(classSummary.createdAt ?? classFallback),
      updatedAt: String(classSummary.updatedAt ?? classSummary.createdAt ?? classFallback),
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
