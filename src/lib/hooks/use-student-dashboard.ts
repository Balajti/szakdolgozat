import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "aws-amplify/auth";

import { fetchStudentDashboard } from "@/lib/api/client";

export function useStudentDashboard(studentId: string = "current") {
  return useQuery({
    queryKey: ["student-dashboard", studentId],
    queryFn: async () => {
      const id = studentId === "current" ? (await getCurrentUser()).userId : studentId;
      return fetchStudentDashboard({ studentId: id });
    },
    staleTime: 1000 * 60,
  });
}
