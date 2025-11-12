import { useQuery } from "@tanstack/react-query";

import { fetchStudentDashboard } from "@/lib/api/client";

export function useStudentDashboard(studentId: string = "current") {
  return useQuery({
    queryKey: ["student-dashboard", studentId],
    queryFn: () => fetchStudentDashboard({ studentId }),
    staleTime: 1000 * 60,
  });
}
