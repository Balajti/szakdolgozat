"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import { GraduationCap, Loader2, Search, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorCard } from "@/components/ui/error-card";
import { Input } from "@/components/ui/input";

interface StudentClassRecord {
  id: string;
  studentId: string;
  classId: string;
  className: string;
  joinedAt: string;
}

interface StudentRow {
  studentId: string;
  name: string;
  email: string;
  level: string;
  streak: number;
  vocabularyCount: number;
  classNames: string[];
  joinedAt: string;
}

/**
 * Roster of every student who joined one of the teacher's classes, with their
 * current level and progress numbers.
 */
export function StudentsOverview({ teacherId }: { teacherId: string }) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { client } = await import("@/lib/amplify-client");

      const listStudentsQuery = /* GraphQL */ `
        query ListStudentsByTeacher($teacherId: ID!) {
          listStudentsByTeacher(teacherId: $teacherId) {
            items {
              id
              studentId
              classId
              className
              joinedAt
            }
          }
        }
      `;
      const response = (await client.graphql({
        query: listStudentsQuery,
        variables: { teacherId },
      })) as { data?: { listStudentsByTeacher?: { items?: StudentClassRecord[] } } };

      const memberships = response.data?.listStudentsByTeacher?.items ?? [];

      // One row per student, collecting all their classes
      const byStudent = new Map<string, { classNames: Set<string>; joinedAt: string }>();
      for (const membership of memberships) {
        const existing = byStudent.get(membership.studentId);
        if (existing) {
          existing.classNames.add(membership.className);
          if (Date.parse(membership.joinedAt) < Date.parse(existing.joinedAt)) {
            existing.joinedAt = membership.joinedAt;
          }
        } else {
          byStudent.set(membership.studentId, {
            classNames: new Set([membership.className]),
            joinedAt: membership.joinedAt,
          });
        }
      }

      const getProfileQuery = /* GraphQL */ `
        query GetStudentProfile($id: ID!) {
          getStudentProfile(id: $id) {
            id
            name
            email
            level
            streak
            vocabularyCount
          }
        }
      `;

      const rows = await Promise.all(
        Array.from(byStudent.entries()).map(async ([studentId, info]) => {
          try {
            const profileResponse = (await client.graphql({
              query: getProfileQuery,
              variables: { id: studentId },
            })) as {
              data?: {
                getStudentProfile?: {
                  name: string;
                  email: string;
                  level: string;
                  streak?: number | null;
                  vocabularyCount?: number | null;
                } | null;
              };
            };
            const profile = profileResponse.data?.getStudentProfile;
            return {
              studentId,
              name: profile?.name ?? "Ismeretlen diák",
              email: profile?.email ?? "",
              level: profile?.level ?? "A1",
              streak: profile?.streak ?? 0,
              vocabularyCount: profile?.vocabularyCount ?? 0,
              classNames: Array.from(info.classNames),
              joinedAt: info.joinedAt,
            } satisfies StudentRow;
          } catch {
            return {
              studentId,
              name: "Ismeretlen diák",
              email: "",
              level: "A1",
              streak: 0,
              vocabularyCount: 0,
              classNames: Array.from(info.classNames),
              joinedAt: info.joinedAt,
            } satisfies StudentRow;
          }
        })
      );

      rows.sort((a, b) => a.name.localeCompare(b.name, "hu"));
      setStudents(rows);
    } catch (err) {
      console.error("Error loading students:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.classNames.some((c) => c.toLowerCase().includes(query))
    );
  }, [students, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center">
        <ErrorCard title="Nem sikerült betölteni a diákokat" onRetry={loadStudents} />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-semibold">Még nincsenek diákjaid</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Hozz létre osztályt és hívd meg a diákokat meghívókóddal — miután csatlakoztak,
            itt látod majd őket.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Keresés név, email vagy osztály szerint..."
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {students.length} diák
        </div>
      </div>

      <div className="grid gap-3">
        {filteredStudents.map((student) => (
          <Card key={student.studentId}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{student.name}</p>
                  {student.email && (
                    <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {student.classNames.map((className) => (
                      <Badge key={className} variant="outline" className="text-xs">
                        {className}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm shrink-0">
                  <div className="text-center">
                    <p className="font-bold">{student.level}</p>
                    <p className="text-xs text-muted-foreground">szint</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{student.vocabularyCount}</p>
                    <p className="text-xs text-muted-foreground">szó</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{student.streak} 🔥</p>
                    <p className="text-xs text-muted-foreground">sorozat</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">
                      csatlakozott{" "}
                      {formatDistanceToNow(new Date(student.joinedAt), {
                        addSuffix: true,
                        locale: hu,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredStudents.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nincs a keresésnek megfelelő diák.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
