import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "aws-amplify/auth";

import { fetchStudentDashboard } from "@/lib/api/client";
import { syncProfileFromCognito } from "@/lib/hooks/use-profile-sync";

export function useStudentDashboard(studentId: string = "current") {
  return useQuery({
    queryKey: ["student-dashboard", studentId],
    queryFn: async () => {
      const id = studentId === "current" ? (await getCurrentUser()).userId : studentId;
      const payload = await fetchStudentDashboard({ studentId: id });
      if (payload.source === "api" && studentId === "current" && payload.profile) {
        payload.profile = await syncProfileFromCognito(payload.profile, "student");
      }
      return payload;
    },
    staleTime: 1000 * 60,
  });
}
