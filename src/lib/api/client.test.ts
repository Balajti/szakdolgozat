import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  mockAssignments,
  mockClassSummaries,
  mockRecommendations,
  mockStudentProfile,
  mockSubmissions,
  mockTeacherProfile,
} from "@/lib/mock-data";
import { getStudentDashboardQuery, getTeacherDashboardQuery } from "@/lib/graphql/operations";

const graphqlMock = vi.fn();

vi.mock("aws-amplify", () => ({
  Amplify: {
    configure: vi.fn(),
  },
}));

vi.mock("aws-amplify/api", () => ({
  generateClient: vi.fn(() => ({
    graphql: graphqlMock,
  })),
}));

describe("WordNest data client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    graphqlMock.mockReset();
  });

  it("returns mock student dashboard data when mock mode is active", async () => {
    vi.stubEnv("NEXT_PUBLIC_WORDNEST_API_MODE", "mock");

    const { fetchStudentDashboard } = await import("@/lib/api/client");

    const result = await fetchStudentDashboard({ studentId: "demo-student" });

    expect(result.source).toBe("mock");
    expect(result.profile.name).toBe(mockStudentProfile.name);
    expect(result.profile.email).toBe(mockStudentProfile.email);
    expect(result.profile.words.length).toBe(mockStudentProfile.words.length);
    expect(result.profile.stories.length).toBe(mockStudentProfile.stories.length);
    expect(result.recommendations).toHaveLength(mockRecommendations.length);
    expect(result.recommendations.map((story) => story.title)).toEqual(
      mockRecommendations.map((story) => story.title),
    );
  });

  it("fetches student dashboard via Amplify when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_WORDNEST_API_MODE", "amplify");

    graphqlMock.mockResolvedValueOnce({
      data: {
        getStudentDashboard: {
          profile: mockStudentProfile,
          recommendations: mockRecommendations,
        },
      },
    });

    const { fetchStudentDashboard } = await import("@/lib/api/client");
    const result = await fetchStudentDashboard({ studentId: "student-123" });
    const { Amplify } = await import("aws-amplify");

    expect(graphqlMock).toHaveBeenCalledWith({
      query: getStudentDashboardQuery,
      variables: { id: "student-123" },
    });
    expect(result.source).toBe("api");
    expect(result.profile).toEqual(mockStudentProfile);
    expect(result.recommendations).toEqual(mockRecommendations);
    expect((Amplify.configure as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("fetches teacher dashboard via Amplify and returns API flag", async () => {
    vi.stubEnv("NEXT_PUBLIC_WORDNEST_API_MODE", "amplify");

    graphqlMock.mockResolvedValueOnce({
      data: {
        getTeacherDashboard: {
          profile: mockTeacherProfile,
          assignments: mockAssignments,
          submissions: mockSubmissions,
          classes: mockClassSummaries,
        },
      },
    });

    const { fetchTeacherDashboard } = await import("@/lib/api/client");
    const result = await fetchTeacherDashboard({ teacherId: "teacher-1" });

    expect(graphqlMock).toHaveBeenCalledWith({
      query: getTeacherDashboardQuery,
      variables: { id: "teacher-1" },
    });
    expect(result.source).toBe("api");
    expect(result.profile).toEqual(mockTeacherProfile);
    expect(result.assignments).toEqual(mockAssignments);
    expect(result.submissions).toEqual(mockSubmissions);
    expect(result.classes).toEqual(mockClassSummaries);
  });

  it("configures Amplify only once even after multiple fetches", async () => {
    vi.stubEnv("NEXT_PUBLIC_WORDNEST_API_MODE", "amplify");

    graphqlMock.mockResolvedValue({
      data: {
        getStudentDashboard: {
          profile: mockStudentProfile,
          recommendations: mockRecommendations,
        },
      },
    });

    const { fetchStudentDashboard } = await import("@/lib/api/client");
    await fetchStudentDashboard({ studentId: "student-1" });
    await fetchStudentDashboard({ studentId: "student-2" });

    const { Amplify } = await import("aws-amplify");
    const configureMock = Amplify.configure as unknown as ReturnType<typeof vi.fn>;

    expect(configureMock.mock.calls.length).toBe(1);
  });
});
