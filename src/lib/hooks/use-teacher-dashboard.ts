import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "aws-amplify/auth";

import { fetchTeacherDashboard } from "@/lib/api/client";

export function useTeacherDashboard(teacherId: string = "current") {
  return useQuery({
    queryKey: ["teacher-dashboard", teacherId],
    queryFn: async () => {
      const id = teacherId === "current" ? (await getCurrentUser()).userId : teacherId;
      return fetchTeacherDashboard({ teacherId: id });
    },
    staleTime: 1000 * 60,
  });
}
