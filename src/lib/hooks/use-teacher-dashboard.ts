import { useQuery } from "@tanstack/react-query";

import { fetchTeacherDashboard } from "@/lib/api/client";

export function useTeacherDashboard(teacherId: string = "current") {
  return useQuery({
    queryKey: ["teacher-dashboard", teacherId],
    queryFn: () => fetchTeacherDashboard({ teacherId }),
    staleTime: 1000 * 60,
  });
}
