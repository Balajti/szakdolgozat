"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import { BarChart3, CheckCircle2, Clock, Loader2, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorCard } from "@/components/ui/error-card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Assignment, SubmissionSummary } from "@/lib/types";

interface AssignmentAnalyticsData {
  assignmentId: string;
  totalSubmissions: number;
  completionRate: number;
  averageScore: number;
  passRate: number;
  averageTimeMinutes: number;
  strugglingStudentIds: string[];
  topPerformerIds: string[];
  mostChallengingWords: string[];
  excellentCount: number;
  goodCount: number;
  needsImprovementCount: number;
}

const analyticsQuery = /* GraphQL */ `
  query GetAssignmentAnalytics($assignmentId: ID!, $teacherId: ID!) {
    getAssignmentAnalytics(assignmentId: $assignmentId, teacherId: $teacherId) {
      assignmentId
      totalSubmissions
      completionRate
      averageScore
      passRate
      averageTimeMinutes
      strugglingStudentIds
      topPerformerIds
      mostChallengingWords
      excellentCount
      goodCount
      needsImprovementCount
    }
  }
`;

const listSubmissionsQuery = /* GraphQL */ `
  query ListSubmissionsByTeacher($teacherId: ID!) {
    listSubmissionsByTeacher(teacherId: $teacherId) {
      items {
        id
        assignmentId
        teacherId
        studentId
        studentName
        submittedAt
        score
        unknownWords
        createdAt
        updatedAt
      }
    }
  }
`;

function StatTile({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border/40">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-display font-bold">
        {value}
        {suffix ? <span className="text-base font-normal text-muted-foreground ml-1">{suffix}</span> : null}
      </p>
    </div>
  );
}

function DistributionBar({
  label,
  count,
  total,
  colorClass,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
}) {
  const width = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{count} diák</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

/**
 * Analytics for one assignment: metric tiles, score distribution, hardest
 * words, and the submissions list. Pass `submissions` when the caller already
 * has them (teacher dashboard); otherwise the panel fetches them itself.
 */
export function AssignmentAnalyticsPanel({
  teacherId,
  assignmentId,
  submissions,
}: {
  teacherId: string;
  assignmentId: string;
  submissions?: SubmissionSummary[];
}) {
  const [analytics, setAnalytics] = useState<AssignmentAnalyticsData | null>(null);
  const [fetchedSubmissions, setFetchedSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!assignmentId || !teacherId) return;
    setLoading(true);
    setError(false);
    try {
      const { client } = await import("@/lib/amplify-client");
      const analyticsPromise = client.graphql({
        query: analyticsQuery,
        variables: { assignmentId, teacherId },
      }) as Promise<{ data?: { getAssignmentAnalytics?: AssignmentAnalyticsData } }>;

      const submissionsPromise = submissions
        ? Promise.resolve(null)
        : (client.graphql({
            query: listSubmissionsQuery,
            variables: { teacherId },
          }) as Promise<{ data?: { listSubmissionsByTeacher?: { items?: SubmissionSummary[] } } }>);

      const [analyticsResponse, submissionsResponse] = await Promise.all([
        analyticsPromise,
        submissionsPromise,
      ]);

      setAnalytics(analyticsResponse.data?.getAssignmentAnalytics ?? null);
      if (submissionsResponse) {
        setFetchedSubmissions(submissionsResponse.data?.listSubmissionsByTeacher?.items ?? []);
      }
    } catch (err) {
      console.error("Error loading assignment analytics:", err);
      setError(true);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, teacherId, submissions]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const assignmentSubmissions = useMemo(
    () =>
      (submissions ?? fetchedSubmissions)
        .filter((s) => s.assignmentId === assignmentId)
        .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)),
    [submissions, fetchedSubmissions, assignmentId]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex justify-center">
        <ErrorCard
          title="Nem sikerült betölteni az elemzést"
          onRetry={loadAnalytics}
        />
      </div>
    );
  }

  const distributionTotal =
    analytics.excellentCount + analytics.goodCount + analytics.needsImprovementCount;

  return (
    <div className="space-y-6">
      {/* Metric tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={<Users className="h-4 w-4" />}
          label="Beküldések"
          value={analytics.totalSubmissions}
          suffix="db"
        />
        <StatTile
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Teljesítési arány"
          value={analytics.completionRate}
          suffix="%"
        />
        <StatTile
          icon={<TrendingUp className="h-4 w-4" />}
          label="Átlag eredmény"
          value={analytics.averageScore}
          suffix="%"
        />
        <StatTile
          icon={<Clock className="h-4 w-4" />}
          label="Átlagos idő"
          value={analytics.averageTimeMinutes}
          suffix="perc"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eredmények megoszlása</CardTitle>
            <CardDescription>
              Sikeres teljesítés (legalább 70%): {analytics.passRate}%
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {distributionTotal === 0 ? (
              <p className="text-sm text-muted-foreground">Még nincs beküldött megoldás.</p>
            ) : (
              <>
                <DistributionBar
                  label="Kiváló (90% felett)"
                  count={analytics.excellentCount}
                  total={distributionTotal}
                  colorClass="bg-green-500"
                />
                <DistributionBar
                  label="Jó (70-89%)"
                  count={analytics.goodCount}
                  total={distributionTotal}
                  colorClass="bg-primary"
                />
                <DistributionBar
                  label="Fejlesztendő (70% alatt)"
                  count={analytics.needsImprovementCount}
                  total={distributionTotal}
                  colorClass="bg-amber-500"
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Challenging words */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legnehezebb szavak</CardTitle>
            <CardDescription>Ezekkel a szavakkal küzdöttek legtöbbet a diákok.</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.mostChallengingWords.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nincs adat — vagy még senki nem küldött be megoldást, vagy mindenki mindent eltalált. 🎉
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {analytics.mostChallengingWords.map((word) => (
                  <Badge key={word} variant="outline" className="text-sm px-3 py-1">
                    {word}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submissions list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beküldött megoldások</CardTitle>
          <CardDescription>A feladat legutóbbi beküldései.</CardDescription>
        </CardHeader>
        <CardContent>
          {assignmentSubmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Még nincs beküldött megoldás ehhez a feladathoz.</p>
          ) : (
            <div className="space-y-3">
              {assignmentSubmissions.slice(0, 20).map((submission) => {
                const score = submission.score ?? 0;
                return (
                  <div
                    key={submission.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{submission.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(submission.submittedAt), {
                          addSuffix: true,
                          locale: hu,
                        })}
                      </p>
                    </div>
                    <Badge
                      className={
                        score >= 90
                          ? "bg-green-100 text-green-800"
                          : score >= 70
                            ? "bg-primary/10 text-primary"
                            : "bg-amber-100 text-amber-800"
                      }
                    >
                      {score}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Teacher dashboard analytics view: assignment picker + the analytics panel.
 */
export function AssignmentAnalytics({
  teacherId,
  assignments,
  submissions,
}: {
  teacherId: string;
  assignments: Assignment[];
  submissions: SubmissionSummary[];
}) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(assignments[0]?.id ?? "");

  useEffect(() => {
    if (!selectedAssignmentId && assignments.length > 0) {
      setSelectedAssignmentId(assignments[0].id);
    }
  }, [assignments, selectedAssignmentId]);

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-semibold">Még nincs feladatod</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Hozz létre és küldj ki feladatokat, hogy itt láthasd a diákok eredményeit.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Feladat kiválasztása</CardTitle>
          <CardDescription>Válaszd ki, melyik feladat eredményeit szeretnéd látni.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-md">
            <Label htmlFor="analytics-assignment">Feladat</Label>
            <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
              <SelectTrigger id="analytics-assignment">
                <SelectValue placeholder="Válassz feladatot" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((assignment) => (
                  <SelectItem key={assignment.id} value={assignment.id}>
                    {assignment.title} ({assignment.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedAssignmentId ? (
        <AssignmentAnalyticsPanel
          teacherId={teacherId}
          assignmentId={selectedAssignmentId}
          submissions={submissions}
        />
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Válassz feladatot az elemzés megtekintéséhez.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
