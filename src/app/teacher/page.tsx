"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarPlus,
  ChevronRight,
  GraduationCap,
  ListChecks,
  Sparkles,
  Users,
  TrendingUp,
  LogOut,
  Loader2
} from "lucide-react";

import { PortalShell } from "@/components/layout/portal-shell";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MetricCard } from "@/components/ui/metric-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeacherDashboard } from "@/lib/hooks/use-teacher-dashboard";
import { cn } from "@/lib/utils";
import type { Assignment, ClassSummary, TeacherProfile } from "@/lib/types";
import { RequireAuth } from "@/components/providers/require-auth";
import { LogoutButton } from "@/components/ui/logout-button";
import { ClassesManagement } from "@/components/teacher/classes-management";

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

function TeacherSidebar({ profile }: { profile: TeacherProfile | undefined }) {
  const router = useRouter();
  
  return (
    <div className="flex h-full flex-col gap-6 text-white/85">
      <button
        onClick={() => router.push("/teacher/profile")}
        className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/30 cursor-pointer"
      >
        <Avatar>
          <AvatarImage src={profile?.avatarUrl || undefined} />
          <AvatarFallback className="bg-white/20 text-white">
            {profile?.name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="overflow-hidden">
          <p className="truncate text-lg font-semibold text-white">{profile?.name}</p>
          <p className="truncate text-xs uppercase tracking-widest text-white/60">Teacher</p>
        </div>
      </button>
      <div className="space-y-3 text-sm">
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Classes</p>
          <p className="text-3xl font-display text-white">{profile ? "Active" : "—"}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Focus</p>
          <p className="text-base text-white">Guided assignments</p>
        </div>
      </div>
      <div className="mt-auto">
        <LogoutButton className="w-full justify-start text-white" variant="ghost">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </LogoutButton>
      </div>
    </div>
  );
}

function TeacherPortalPageInner() {
  const router = useRouter();
  const { data, isLoading, isFetching, error } = useTeacherDashboard();

  const assignments: Assignment[] = useMemo(() => data?.assignments ?? [], [data?.assignments]);
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
      <div className="flex h-screen items-center justify-center">
        <Alert variant="destructive" title="Hiba történt" description="Nem sikerült betölteni a tanári adataidat. Próbáld újra később." />
      </div>
    );
  }

  if (isLoading || !data?.profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const profile: TeacherProfile = data.profile;

  return (
    <PortalShell sidebar={<TeacherSidebar profile={profile} />}>
      <div className="flex flex-col gap-10">
        <section className="grid gap-6 xl:grid-cols-[3fr_2fr]">
          <div className="rounded-[3rem] border border-white/50 bg-gradient-to-br from-primary via-[#ffb37b] to-transparent p-8 text-[#2c1406] shadow-[0_35px_120px_-45px_rgba(0,0,0,0.8)]">
            <Badge variant="outline" className="border-[#2c1406]/20 bg-white/30 text-[#2c1406]">
              Tanári irányítópult
            </Badge>
            <h1 className="mt-6 text-4xl font-display leading-tight">
              Üdv újra, {profile.name.split(" ")[0]}!
            </h1>
            <p className="mt-4 max-w-3xl text-base text-[#2c1406]/80">
              Kövesd az osztályok haladását, készíts személyre szabott feladatokat és tartsd mozgásban a diákok kreativitását.
            </p>
            {lastSyncedAt ? (
              <p className="mt-6 text-xs uppercase tracking-[0.4em] text-[#2c1406]/70">
                Utolsó szinkron: {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true, locale: hu })}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="gradient" className="gap-2" onClick={() => router.push('/teacher/assignment/create')}>
                <Sparkles className="size-5" />
                Új AI feladat
              </Button>
              <Button size="lg" variant="outline" className="gap-2" onClick={() => router.push('/teacher/assignments')}>
                <ListChecks className="size-5" />
                Feladatok megtekintése
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            <Card className="flex flex-col gap-4 bg-white/85 p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Aktív diákok</p>
                <Users className="size-5 text-primary" />
              </div>
              <p className="text-5xl font-display font-semibold">{totalStudents}</p>
              <p className="text-sm text-muted-foreground">összesített létszám</p>
            </Card>
            <Card className="bg-accent text-white">
              <CardHeader>
                <CardTitle className="text-white">Folyamatban lévő feladatok</CardTitle>
                <CardDescription className="text-white/80">
                  {activeAssignments.length} kijelölt feladat figyelmet igényel
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-white">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">Következő határidő</p>
                  <p className="text-3xl font-display">
                    {upcomingDeadlines[0]
                      ? new Date(upcomingDeadlines[0].dueDate).toLocaleDateString("hu-HU")
                      : "Nincs"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm">
                  Legaktívabb: {mostActiveClassName}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {isFetching && (
          <Alert
            variant="info"
            title="Adatok frissítése"
            description="A tanári irányítópult legfrissebb adatait töltjük be."
          />
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="size-4" />
              Áttekintés
            </TabsTrigger>
            <TabsTrigger value="classes" className="gap-2">
              <Users className="size-4" />
              Osztályok
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

          {/* Classes Tab */}
          <TabsContent value="classes">
            <ClassesManagement teacherId={profile.id} />
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
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

            <div className="grid gap-8 xl:grid-cols-[3fr_2fr]">
              <Card>
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
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <BookOpenCheck className="size-12 text-muted-foreground/40" />
                        <h3 className="mt-4 text-lg font-semibold text-foreground">Még nincs feladatod</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Hozz létre az első feladatodat az AI segítségével!
                        </p>
                      </div>
                    ) : (
                      assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="mb-4 rounded-[1.75rem] border border-border/50 bg-white/80 p-5 shadow-[0_25px_80px_-60px_rgba(0,0,0,0.9)]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold text-foreground">{assignment.title}</p>
                              <p className="text-sm text-muted-foreground">Szint: {assignment.level}</p>
                            </div>
                            <Badge className={cn(assignmentStatusAccent[assignment.status])}>
                              {assignmentStatusLabels[assignment.status]}
                            </Badge>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              Határidő: {new Date(assignment.dueDate).toLocaleDateString("hu-HU")}
                            </span>
                            <Button variant="ghost" size="sm" className="h-auto p-0 text-primary">
                              Részletek <ChevronRight className="ml-1 size-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gyorsműveletek</CardTitle>
                    <CardDescription>Leggyakrabban használt lépések.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <Button variant="outline" className="justify-start">
                      <ListChecks className="mr-2 size-4" />
                      Új feladatlap
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Users className="mr-2 size-4" />
                      Osztály kezelése
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <TrendingUp className="mr-2 size-4" />
                      Elemzések exportálása
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Kiemelt osztály</CardTitle>
                    <CardDescription>Válaszd ki, melyik csoportot figyeled.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <select
                      className="w-full rounded-2xl border border-border/40 bg-white/70 px-4 py-3 text-sm"
                      value={selectedClassId}
                      onChange={(event) => setSelectedClassId(event.target.value)}
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} ({cls.studentCount} fő)
                        </option>
                      ))}
                    </select>
                    {selectedClass ? (
                      <div className="rounded-2xl border border-border/50 bg-muted/40 p-4 text-sm">
                        <p className="font-semibold text-foreground">{selectedClass.name}</p>
                        <p className="text-muted-foreground">Átlag szint: {selectedClass.averageLevel}</p>
                        <p className="text-muted-foreground">Teljesítés: {Math.round(selectedClass.completionRate * 100)}%</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Elemzések</CardTitle>
                <CardDescription>Részletes statisztikák az osztályok teljesítményéről.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Hamarosan...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <Card>
              <CardHeader>
                <CardTitle>Feladatok</CardTitle>
                <CardDescription>Kezeld a kiadott és piszkozat feladatokat.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Hamarosan...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Diákok</CardTitle>
                <CardDescription>Diákok listája és egyéni fejlődésük.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Hamarosan...</p>
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
    <RequireAuth role="teacher">
      <TeacherPortalPageInner />
    </RequireAuth>
  );
}
