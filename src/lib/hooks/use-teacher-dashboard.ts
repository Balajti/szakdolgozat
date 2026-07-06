import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "aws-amplify/auth";

import { fetchTeacherDashboard } from "@/lib/api/client";
import { syncProfileFromCognito } from "@/lib/hooks/use-profile-sync";

export function useTeacherDashboard(teacherId: string = "current") {
  return useQuery({
    queryKey: ["teacher-dashboard", teacherId],
    queryFn: async () => {
      const id = teacherId === "current" ? (await getCurrentUser()).userId : teacherId;
      const payload = await fetchTeacherDashboard({ teacherId: id });
      if (payload.source === "api" && teacherId === "current" && payload.profile) {
        payload.profile = await syncProfileFromCognito(payload.profile, "teacher");
      }
      return payload;
    },
    staleTime: 1000 * 60,
  });
}
