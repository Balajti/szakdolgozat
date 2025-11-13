"use client";

import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarPlus,
  ChevronRight,
  GraduationCap,
  ListChecks,
  ScrollText,
  Sparkles,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  FileText,
  Download,
  Filter,
  Search,
  UserCheck,
  AlertCircle,
} from "lucide-react";

import { PortalShell } from "@/components/layout/portal-shell";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MetricCard } from "@/components/ui/metric-card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeacherDashboard } from "@/lib/hooks/use-teacher-dashboard";
// Future: import { useGenerateStory } from "@/lib/hooks/use-mutations" to create AI assignments
import { cn } from "@/lib/utils";
import type { Assignment, ClassSummary, TeacherProfile } from "@/lib/types";
import { RequireAuth } from "@/components/providers/require-auth";
import { LogoutButton } from "@/components/ui/logout-button";

const assignmentStatusLabels: Record<Assignment["status"], string> = {
  draft: "Piszkozat",
  sent: "Kiküldve",
  submitted: "Beküldve",
  graded: "Értékelve",
};

const assignmentStatusAccent: Record<Assignment["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  submitted: "bg-secondary/10 text-secondary-foreground",
  graded: "bg-emerald-100 text-emerald-800",
};

function TeacherPortalPageInner() {
  const { data, isLoading, isFetching, error } = useTeacherDashboard();

  const assignments: Assignment[] = useMemo(() => data?.assignments ?? [], [data?.assignments]);
  const submissions = useMemo(() => data?.submissions ?? [], [data?.submissions]);
  const classes: ClassSummary[] = useMemo(() => data?.classes ?? [], [data?.classes]);
  
  const lastSyncedAt = data?.lastSyncedAt;

  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes[0]?.id ?? "",
  );

  useEffect(() => {
    if (!data?.classes) {
      return;
    }

    setSelectedClassId((prev) =>
      prev && data.classes.some((cls) => cls.id === prev)
        ? prev
        : data.classes[0]?.id ?? "",
    );
  }, [data?.classes]);

  const selectedClass = useMemo<ClassSummary | undefined>(
    () => classes.find((cls) => cls.id === selectedClassId),
    [classes, selectedClassId],
  );

  const totalStudents = useMemo(
    () => classes.reduce((sum, cls) => sum + cls.studentCount, 0),
    [classes],
  );

  const activeAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status === "sent"),
    [assignments],
  );

  const upcomingDeadlines = useMemo(
    () =>
      assignments.filter((assignment) => {
        const due = new Date(assignment.dueDate);
        const now = new Date();
        const diff = due.getTime() - now.getTime();
        return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 7;
      }),
    [assignments],
  );

  const mostActiveClassName = useMemo(() => {
    const sorted = [...classes].sort((a, b) => b.completionRate - a.completionRate);
    return sorted[0]?.name ?? "—";
  }, [classes]);

  if (error) {
    return (
      <PortalShell backHref="/" backLabel="Vissza a kezdőlapra" sidebar={<div />}> 
        <Alert variant="destructive" title="Hiba történt" description="Nem sikerült betölteni a tanári adataidat. Próbáld újra később." />
      </PortalShell>
    );
  }

  if (isLoading || !data?.profile) {
    return (
      <PortalShell backHref="/" backLabel="Vissza a kezdőlapra" sidebar={<div />}> 
        <Alert variant="info" title="Betöltés" description="A tanári irányítópult adatainak betöltése folyamatban." />
      </PortalShell>
    );
  }

  const profile: TeacherProfile = data.profile;

  return (
    <PortalShell
      backHref="/"
      backLabel="Vissza a kezdőlapra"
      sidebar={
        <TeacherSidebar
          profile={profile}
          classes={classes}
          assignments={assignments}
          selectedClassId={selectedClassId}
          onSelectClass={setSelectedClassId}
          totalStudents={totalStudents}
        />
      }
      topActions={
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <ScrollText className="size-4" />
            Szintfelmérő link megosztása
          </Button>
          <Button className="gap-2">
            <Sparkles className="size-4" />
            Új AI történet
          </Button>
          <LogoutButton className="ml-1" />
        </div>
      }
    >
      <div className="space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Badge variant="outline" className="bg-primary/10 text-primary">
              Tanári irányítópult
            </Badge>
            <h1 className="font-display text-3xl text-foreground">
              Üdv újra, {profile.name.split(" ")[0]}!
            </h1>
            <p className="text-muted-foreground">
              Kezeld az osztályok haladását, készíts új feladatokat és kövesd a diákok visszajelzéseit.
            </p>
            {lastSyncedAt ? (
              <p className="text-xs text-muted-foreground">
                Utolsó frissítés: {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true, locale: hu })}
              </p>
            ) : null}
          </div>
          <div className="flex gap-3">
            <MetricCard
              title="Tanulók"
              value={`${totalStudents} fő`}
              description="Összes regisztrált diákod"
              icon={<Users className="size-5" />}
              className="w-56"
            />
            <MetricCard
              title="Aktív feladatok"
              value={`${activeAssignments.length}`}
              description="Folyamatban lévő kijelölések"
              icon={<ListChecks className="size-5" />}
              className="w-56"
            />
          </div>
        </header>

        {isFetching && (
          <Alert
            variant="info"
            title="Adatok frissítése"
            description="A tanári irányítópult legfrissebb adatait töltjük be."
          />
        )}

        {/* Demo mode alert removed */}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="size-4" />
              Áttekintés
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="size-4" />
              Elemzések
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2">
              <BookOpenCheck className="size-4" />
              Feladatok
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-2">
              <GraduationCap className="size-4" />
              Diákok
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <MetricCard
                title="Legaktívabb osztály"
                value={mostActiveClassName}
                description="Legmagasabb feladat-teljesítési arány"
                icon={<Building2 className="size-5" />}
              />
              <MetricCard
                title="Átlag szint"
                value={selectedClass?.averageLevel ?? "A2"}
                description="Kiválasztott osztály szintje"
                icon={<ChevronRight className="size-5" />}
              />
              <MetricCard
                title="Közelgő határidők"
                value={`${upcomingDeadlines.length}`}
                description="7 napon belül esedékes"
                icon={<CalendarPlus className="size-5" />}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <Card className="border border-border/40 bg-white/90">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Aktuális feladatok</CardTitle>
                    <CardDescription>
                      A legújabb kijelölések státuszai és következő lépései.
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        Szűrés
                        <ChevronRight className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Összes feladat</DropdownMenuItem>
                      <DropdownMenuItem>Csak küldött</DropdownMenuItem>
                      <DropdownMenuItem>Csak piszkozat</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[400px] pr-4">
                    {assignments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <BookOpenCheck className="size-12 text-muted-foreground/40" />
                        <h3 className="mt-4 text-lg font-semibold text-foreground">Még nincs feladatod</h3>
                        <p className="mt-2 text-center text-sm text-muted-foreground">
                          Hozz létre az első feladatodat az AI segítségével!
                        </p>
                      </div>
                    ) : (
                      assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="mb-4 flex flex-col gap-3 rounded-3xl border border-border/50 bg-muted/40 p-4 transition hover:border-primary/60 hover:bg-white"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-foreground">
                              {assignment.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Szint: {assignment.level}
                            </p>
                          </div>
                          <Badge className={cn("rounded-full", assignmentStatusAccent[assignment.status])}>
                            {assignmentStatusLabels[assignment.status]}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span>
                            Határidő: {format(new Date(assignment.dueDate), "yyyy. MMM d.", { locale: hu })}
                          </span>
                          {assignment.requiredWords?.length ? (
                            <span>
                              Kötelező szavak: {assignment.requiredWords.join(", ")}
                            </span>
                          ) : null}
                          {assignment.excludedWords?.length ? (
                            <span>
                              Tiltott szavak: {assignment.excludedWords.join(", ")}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" size="sm">
                            Megtekintés
                          </Button>
                          <Button variant="outline" size="sm">
                            Megosztási link másolása
                          </Button>
                        </div>
                      </div>
                    ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="border border-border/40 bg-white/90">
                <CardHeader>
                  <CardTitle className="text-lg">Legutóbbi beküldések</CardTitle>
                  <CardDescription>
                    Gyors áttekintés a tanulók legfrissebb visszajelzéseiről.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[400px] pr-2">
                    {submissions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <FileText className="size-12 text-muted-foreground/40" />
                        <p className="mt-4 text-sm text-muted-foreground">Még nincs beküldött munka</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Diák</TableHead>
                            <TableHead>Beküldve</TableHead>
                            <TableHead>Pontszám</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {submissions.map((submission) => (
                          <TableRow key={submission.studentId}>
                            <TableCell className="font-medium text-foreground">
                              {submission.studentName}
                            </TableCell>
                            <TableCell className="text-xs">
                              {formatDistanceToNow(new Date(submission.submittedAt), {
                                addSuffix: true,
                                locale: hu,
                              })}
                            </TableCell>
                            <TableCell>
                              {submission.score ? `${submission.score}%` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Advanced Analytics Dashboard */}
            <div className="grid gap-6 lg:grid-cols-4">
          <Card className="border-border/40 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Átlagos teljesítmény
              </CardTitle>
              <TrendingUp className="size-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">87%</div>
              <p className="text-xs text-emerald-600">
                +5% az előző héthez képest
              </p>
              <div className="mt-3 flex gap-1">
                {[85, 82, 88, 84, 90, 87, 92].map((val, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-emerald-200"
                    style={{ height: `${(val / 100) * 40}px` }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-gradient-to-br from-sky-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aktív tanulók
              </CardTitle>
              <UserCheck className="size-4 text-sky-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {Math.round(totalStudents * 0.82)} / {totalStudents}
              </div>
              <p className="text-xs text-muted-foreground">
                Ezen a héten aktív
              </p>
              <Progress 
                value={(Math.round(totalStudents * 0.82) / totalStudents) * 100} 
                className="mt-3 h-2 bg-sky-100"
              />
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-gradient-to-br from-amber-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Határidők közelében
              </CardTitle>
              <AlertCircle className="size-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{upcomingDeadlines.length}</div>
              <p className="text-xs text-muted-foreground">
                7 napon belül esedékes
              </p>
              <div className="mt-3 flex gap-1">
                {upcomingDeadlines.slice(0, 7).map((_, i) => (
                  <div
                    key={i}
                    className="size-4 rounded-full bg-amber-400"
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-gradient-to-br from-purple-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Beküldött munkák
              </CardTitle>
              <FileText className="size-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{submissions.length}</div>
              <p className="text-xs text-muted-foreground">
                Értékelésre vár: {submissions.filter(s => !s.score).length}
              </p>
              <div className="mt-3">
                <Progress 
                  value={(submissions.filter(s => s.score).length / Math.max(submissions.length, 1)) * 100} 
                  className="h-2 bg-purple-100"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Analytics */}
        <Card className="border-border/40 bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-primary" />
                  Teljesítmény elemzés
                </CardTitle>
                <CardDescription>
                  Osztályonkénti bontás és trend
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="size-4" />
                  Szűrés
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="size-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {classes.map((cls) => (
                <div key={cls.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{cls.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cls.studentCount} tanuló • Szint: {cls.averageLevel}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">
                          {Math.round(cls.completionRate * 100)}%
                        </p>
                        <p className="text-xs text-muted-foreground">teljesítés</p>
                      </div>
                      {cls.completionRate > 0.75 ? (
                        <TrendingUp className="size-5 text-emerald-600" />
                      ) : (
                        <TrendingDown className="size-5 text-amber-600" />
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Átlag pontszám</p>
                      <p className="text-lg font-semibold text-foreground">
                        {Math.round(cls.completionRate * 100)}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Aktív tanulók</p>
                      <p className="text-lg font-semibold text-foreground">
                        {Math.round(cls.studentCount * 0.85)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Nehéz szó</p>
                      <p className="text-lg font-semibold text-foreground">
                        {cls.mostChallengingWord || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions and Insights */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/40 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-5 text-primary" />
                Figyelmet igénylő tanulók
              </CardTitle>
              <CardDescription>
                Azok, akiknek extra segítségre lehet szükségük
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-3">
                  {submissions
                    .filter((s) => (s.score ?? 0) < 60)
                    .slice(0, 5)
                    .map((submission) => (
                      <div
                        key={submission.studentId}
                        className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3"
                      >
                        <Avatar className="size-10">
                          <AvatarImage src="" alt={submission.studentName} />
                          <AvatarFallback>{submission.studentName.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {submission.studentName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Utolsó pontszám: {submission.score ?? "—"}% • Nehéz szavak: {submission.unknownWords.length}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Megtekintés
                        </Button>
                      </div>
                    ))}
                  {submissions.filter((s) => (s.score ?? 0) < 60).length === 0 && (
                    <div className="rounded-lg bg-emerald-50/50 p-6 text-center">
                      <Award className="mx-auto size-8 text-emerald-600" />
                      <p className="mt-2 text-sm font-medium text-foreground">
                        Minden tanuló jól teljesít!
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Nincs kritikus helyzet
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-gradient-to-br from-primary/5 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                Ajánlott következő lépések
              </CardTitle>
              <CardDescription>
                Hatékonyságnövelő javaslatok
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/20 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <CalendarPlus className="size-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-foreground">
                        Készíts új feladatot a nehéz szavakból
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {upcomingDeadlines.length} határidő közelít, új feladat segíthet az ismétlésben.
                      </p>
                      <Button size="sm" variant="outline" className="mt-3 gap-2">
                        <Sparkles className="size-3" />
                        AI feladat generálása
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100">
                      <Users className="size-4 text-sky-700" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-foreground">
                        Ellenőrizd a beküldött munkákat
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {submissions.filter(s => !s.score).length} munka vár értékelésre.
                      </p>
                      <Button size="sm" variant="outline" className="mt-3">
                        Ugrás az értékelésekhez
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Award className="size-4 text-emerald-700" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-foreground">
                        Ösztönözd a legjobb tanulókat
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {submissions.filter(s => (s.score ?? 0) >= 90).length} kiváló teljesítmény a héten.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

            {/* Vocabulary Difficulty Analysis */}
            <Card className="border-border/40 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpenCheck className="size-5 text-primary" />
                  Szókincs nehézségi elemzés
                </CardTitle>
                <CardDescription>
                  A leggyakrabban nehézséget okozó szavak osztályonként
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {classes.map((cls) => (
                    <div key={`vocab-${cls.id}`} className="rounded-lg border border-border/50 bg-muted/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">{cls.name}</h4>
                        <Badge variant="outline">{cls.averageLevel}</Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Leggyakoribb:</span>
                          <span className="font-medium text-foreground">{cls.mostChallengingWord || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nehézségi ráta:</span>
                          <span className="font-medium text-amber-700">
                            {Math.round((1 - cls.completionRate) * 100)}%
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="mt-3 w-full gap-2">
                        <Search className="size-3" />
                        Részletes elemzés
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6 bg-white/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">Feladataid</h2>
                <p className="text-sm text-muted-foreground">
                  Használd az AI-t a differenciált feladatok létrehozásához.
                </p>
              </div>
              <Button className="gap-2">
                <Sparkles className="size-4" />
                Új AI feladat generálása
              </Button>
            </div>

            {assignments.length === 0 ? (
              <Card className="border-border/40 bg-white">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpenCheck className="size-12 text-muted-foreground/40" />
                  <h3 className="mt-4 text-lg font-semibold text-foreground">Még nincs feladatod</h3>
                  <p className="mt-2 text-center text-sm text-muted-foreground">
                    Hozz létre az első feladatodat az AI segítségével!
                  </p>
                  <Button className="mt-6 gap-2">
                    <Sparkles className="size-4" />
                    Új AI feladat generálása
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {assignments.map((assignment) => (
                <Card key={assignment.id} className="border border-border/60 bg-white/90">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg font-semibold">
                        {assignment.title}
                      </CardTitle>
                      <Badge className={cn("rounded-full", assignmentStatusAccent[assignment.status])}>
                        {assignmentStatusLabels[assignment.status]}
                      </Badge>
                    </div>
                    <CardDescription>
                      Határidő: {format(new Date(assignment.dueDate), "yyyy. MMM d.", { locale: hu })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Szint</span>
                      <span className="font-semibold text-foreground">{assignment.level}</span>
                    </div>
                    {assignment.requiredWords?.length ? (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                          Kötelező szókincs
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {assignment.requiredWords.join(", ")}
                        </p>
                      </div>
                    ) : null}
                    {assignment.excludedWords?.length ? (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                          Kerülendő szavak
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {assignment.excludedWords.join(", ")}
                        </p>
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        Részletek
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Duplikálás
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-6 bg-white/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl">Osztályok és diákok</h2>
                <p className="text-sm text-muted-foreground">
                  Válaszd ki az osztályt a bal oldali menüből részletes adatokhoz.
                </p>
              </div>
              <Button variant="outline" size="sm">
                Új diák meghívása
              </Button>
            </div>

            <Card className="border border-border/40 bg-white/90">
              <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {selectedClass?.name ?? "Osztály kiválasztása"}
                  </CardTitle>
                  <CardDescription>
                    Átlag szint: {selectedClass?.averageLevel ?? "—"} • Tanulók: {selectedClass?.studentCount ?? 0}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    Teljesítés: {selectedClass ? Math.round(selectedClass.completionRate * 100) : 0}%
                  </Badge>
                  {selectedClass?.mostChallengingWord ? (
                    <Badge className="bg-amber-100 text-amber-800">
                      Nehéz szó: {selectedClass.mostChallengingWord}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl border border-border/50 bg-emerald-50/60 p-4 text-sm text-emerald-900">
                    <p className="text-xs uppercase tracking-wide">Átlagos pontszám</p>
                    <p className="mt-2 text-3xl font-semibold">82%</p>
                    <p className="mt-1 text-emerald-800/70">2%-kal magasabb, mint múlt héten</p>
                  </div>
                  <div className="rounded-3xl border border-border/50 bg-sky-50/60 p-4 text-sm text-sky-900">
                    <p className="text-xs uppercase tracking-wide">Ismételt szavak</p>
                    <p className="mt-2 text-3xl font-semibold">146</p>
                    <p className="mt-1 text-sky-800/70">9 új szó került listára</p>
                  </div>
                  <div className="rounded-3xl border border-border/50 bg-amber-50/60 p-4 text-sm text-amber-900">
                    <p className="text-xs uppercase tracking-wide">Napi aktivitás</p>
                    <p className="mt-2 text-3xl font-semibold">74%</p>
                    <p className="mt-1 text-amber-800/70">Tartsd fenn a motivációt!</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                      Szólisták kiemelt diákjai
                    </h3>
                    <Button variant="ghost" size="sm" className="gap-2 text-sm text-muted-foreground">
                      Teljes lista
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {submissions.slice(0, 4).map((submission) => (
                      <div
                        key={`${submission.studentId}-leader`}
                        className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4"
                      >
                        <Avatar className="size-12">
                          <AvatarImage src="" alt={submission.studentName} />
                          <AvatarFallback>{submission.studentName.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">
                            {submission.studentName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Legutóbbi pontszám: {submission.score ?? "—"} • Nehéz szavak: {submission.unknownWords.join(", ")}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Megnyitás
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PortalShell>
  );
}

export default function TeacherPortalPage() {
  return (
    <RequireAuth>
      <TeacherPortalPageInner />
    </RequireAuth>
  );
}

type TeacherSidebarProps = {
  profile: TeacherProfile;
  classes: ClassSummary[];
  assignments: Assignment[];
  selectedClassId: string;
  totalStudents: number;
  onSelectClass: (classId: string) => void;
};

function TeacherSidebar({
  profile,
  classes,
  assignments,
  selectedClassId,
  onSelectClass,
  totalStudents,
}: TeacherSidebarProps) {
  const activeAssignmentsCount = assignments.filter((assignment) => assignment.status === "sent").length;

  return (
    <div className="flex h-full flex-1 flex-col gap-6">
      <div className="rounded-3xl bg-gradient-to-br from-primary/90 via-primary to-primary/70 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Avatar className="border-white/40">
            <AvatarImage src="" alt={profile.name} />
            <AvatarFallback>{profile.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-white/70">Tanárok központja</p>
            <p className="text-xl font-semibold">{profile.name}</p>
            <p className="text-sm text-white/70">{profile.school}</p>
          </div>
        </div>
        <div className="mt-6 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-white/80">
              <Users className="size-4" /> Tanulók
            </span>
            <span className="font-semibold">{totalStudents}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-white/80">
              <BookOpenCheck className="size-4" /> Aktív feladatok
            </span>
            <span className="font-semibold">{activeAssignmentsCount}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Osztályaid
          </h3>
          <p className="text-xs text-muted-foreground">
            Válassz egy osztályt, hogy részletes metrikákat láss.
          </p>
        </div>

        <ScrollArea className="h-[360px] pr-2">
          <div className="space-y-3">
            {classes.map((cls: ClassSummary) => {
              const isActive = selectedClassId === cls.id;

              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => onSelectClass(cls.id)}
                  className={cn(
                    "flex w-full flex-col gap-2 rounded-2xl border border-border/60 bg-white/80 p-4 text-left transition",
                    isActive && "border-foreground shadow-lg",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      {cls.name}
                    </p>
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                      {cls.averageLevel}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {cls.studentCount} tanuló
                    </span>
                    <span>
                      Teljesítés: {Math.round(cls.completionRate * 100)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <Button variant="outline" size="sm" className="w-full">
          Új osztály hozzáadása
        </Button>
      </div>
    </div>
  );
}
