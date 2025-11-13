import { generateClient } from "aws-amplify/api";

import { ensureAmplifyConfigured } from "@/lib/api/config";
import {
  mockAssignments,
  mockClassSummaries,
  mockRecommendations,
  mockStudentProfile,
  mockSubmissions,
  mockTeacherProfile,
} from "@/lib/mock-data";
import type {
  Assignment,
  ClassSummary,
  Story,
  StudentProfile,
  SubmissionSummary,
  TeacherProfile,
} from "@/lib/types";
import { getStudentDashboardQuery, getTeacherDashboardQuery } from "@/lib/graphql/operations";

type DataSource = "mock" | "api";

type StudentDashboardQueryResult = {
  getStudentDashboard?: {
    profile: StudentProfile;
    recommendations: Story[];
  } | null;
};

type TeacherDashboardQueryResult = {
  getTeacherDashboard?: {
    profile: TeacherProfile;
    assignments: Assignment[];
    submissions: SubmissionSummary[];
    classes: ClassSummary[];
  } | null;
};

function getQueryData<T>(response: unknown): T {
  if (typeof response !== "object" || response === null || !("data" in response)) {
    throw new Error("Unexpected GraphQL subscription result");
  }

  const { data } = response as { data?: T | null };

  if (!data) {
    throw new Error("Missing data in GraphQL response");
  }

  return data;
}

export interface StudentDashboardPayload {
  profile: StudentProfile;
  recommendations: Story[];
  source: DataSource;
  lastSyncedAt: string;
}

export interface TeacherDashboardPayload {
  profile: TeacherProfile;
  assignments: Assignment[];
  submissions: SubmissionSummary[];
  classes: ClassSummary[];
  source: DataSource;
  lastSyncedAt: string;
}

type FetchMode = "mock" | "amplify";

const fetchMode: FetchMode =
  (process.env.NEXT_PUBLIC_WORDNEST_API_MODE as FetchMode | undefined) ?? "amplify";

const client = () => {
  ensureAmplifyConfigured();
  return generateClient({});
};

export async function fetchStudentDashboard(options: { studentId: string }): Promise<StudentDashboardPayload> {
  if (fetchMode === "mock") {
    return {
      profile: mockStudentProfile,
      recommendations: mockRecommendations,
      source: "mock",
      lastSyncedAt: new Date().toISOString(),
    };
  }

  const gql = client();
  const response = await gql.graphql({
    query: getStudentDashboardQuery,
    variables: { id: options.studentId },
  });

  const data = getQueryData<StudentDashboardQueryResult>(response);

  if (!data.getStudentDashboard) {
    throw new Error("Unexpected API response while fetching student dashboard");
  }

  const { profile, recommendations } = data.getStudentDashboard;

  return {
    profile,
    recommendations,
    source: "api",
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function fetchTeacherDashboard(options: { teacherId: string }): Promise<TeacherDashboardPayload> {
  if (fetchMode === "mock") {
    return {
      profile: mockTeacherProfile,
      assignments: mockAssignments,
      submissions: mockSubmissions,
      classes: mockClassSummaries,
      source: "mock",
      lastSyncedAt: new Date().toISOString(),
    };
  }

  const gql = client();
  const response = await gql.graphql({
    query: getTeacherDashboardQuery,
    variables: { id: options.teacherId },
  });

  const data = getQueryData<TeacherDashboardQueryResult>(response);

  if (!data.getTeacherDashboard) {
    throw new Error("Unexpected API response while fetching teacher dashboard");
  }

  const result = data.getTeacherDashboard;

  return {
    ...result,
    source: "api",
    lastSyncedAt: new Date().toISOString(),
  };
}
