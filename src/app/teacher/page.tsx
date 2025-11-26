"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
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
  Loader2,
  Settings,
  Award
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MetricCard } from "@/components/ui/metric-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTeacherDashboard } from "@/lib/hooks/use-teacher-dashboard";
import { cn } from "@/lib/utils";
import type { Assignment, ClassSummary, TeacherProfile } from "@/lib/types";
import { RequireAuth } from "@/components/providers/require-auth";
import { LogoutButton } from "@/components/ui/logout-button";
import { ClassesManagement } from "@/components/teacher/classes-management";
import { useAvatarUrl } from "@/hooks/use-avatar-url";

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

const dashboardNavItems = [
  { value: 'overview' as const, label: 'Áttekintés', icon: TrendingUp },
  { value: 'classes' as const, label: 'Osztályok', icon: Users },
  { value: 'assignments' as const, label: 'Feladatok', icon: BookOpenCheck },
  { value: 'analytics' as const, label: 'Elemzések', icon: BarChart3 },
  { value: 'students' as const, label: 'Diákok', icon: GraduationCap },
];

type DashboardView = typeof dashboardNavItems[number]['value'];

function TeacherPortalPageInner() {
  const router = useRouter();
  const { data, isLoading, isFetching, error } = useTeacherDashboard();
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Fetch signed URL for avatar
  const avatarUrl = useAvatarUrl(data?.profile?.avatarUrl);

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

  const handleViewChange = (view: DashboardView) => {
    setActiveView(view);
    setIsMobileNavOpen(false);
  };

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Alert variant="destructive" title="Hiba történt" description="Nem sikerült betölteni a tanári adataidat. Próbáld újra később." />
      </div>
    );
  }

  if (isLoading || !data?.profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const profile: TeacherProfile = data.profile;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-display font-bold text-foreground">WordNest</h1>
              <nav className="hidden lg:flex flex-1 items-center justify-end gap-2">
                {dashboardNavItems.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant={activeView === value ? 'default' : 'ghost'}
                    onClick={() => handleViewChange(value)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                ))}
                <div className="mx-3 h-6 w-px bg-border/60" />
                <Button onClick={() => router.push('/teacher/assignment/create')} size="sm" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Új feladat
                </Button>
                <button
                  onClick={() => router.push('/teacher/profile')}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/50 transition-colors hover:bg-muted cursor-pointer"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {profile?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{profile?.name?.split(" ").pop()}</span>
                </button>
                <LogoutButton variant="secondary" size="sm" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Kilépés
                </LogoutButton>
              </nav>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileNavOpen((prev) => !prev)}
                aria-label="Navigáció megnyitása"
              >
                <HamburgerIcon open={isMobileNavOpen} />
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {isMobileNavOpen && (
                <motion.nav
                  key="mobile-nav"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="lg:hidden -mx-6 px-6 pb-4 border-t border-border/30 flex flex-col gap-2"
                >
                  {dashboardNavItems.map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      variant={activeView === value ? 'default' : 'ghost'}
                      onClick={() => handleViewChange(value)}
                      className="gap-3 justify-start w-full"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                  <div className="pt-4 mt-2 border-t border-border/30 space-y-3">
                    <Button onClick={() => router.push('/teacher/assignment/create')} className="w-full gap-2">
                      <Sparkles className="h-4 w-4" />
                      Új feladat
                    </Button>
                    <button
                      onClick={() => {
                        router.push('/teacher/profile');
                        setIsMobileNavOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 transition-colors hover:bg-muted/60 cursor-pointer"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={avatarUrl || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                          {profile?.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">{profile?.name}</p>
                        <p className="text-xs text-muted-foreground">Profil megtekintése</p>
                      </div>
                    </button>
                    <LogoutButton
                      size="default"
                      className="w-full justify-center gap-2"
                      variant="outline"
                    >
                      <LogOut className="h-4 w-4" />
                      Kilépés
                    </LogoutButton>
                  </div>
                </motion.nav>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {activeView === 'overview' && (
          <div className="space-y-8">
            {/* Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-2xl p-6 border border-border/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Diákok</span>
                </div>
                <p className="text-3xl font-display font-bold">{totalStudents}</p>
                <p className="text-xs text-muted-foreground mt-1">összesen</p>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Building2 className="h-5 w-5 text-accent" />
                  </div>
                  <span className="text-sm text-muted-foreground">Osztályok</span>
                </div>
                <p className="text-3xl font-display font-bold">{classes.length}</p>
                <p className="text-xs text-muted-foreground mt-1">aktív</p>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <BookOpenCheck className="h-5 w-5 text-secondary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Feladatok</span>
                </div>
                <p className="text-3xl font-display font-bold">{activeAssignments.length}</p>
                <p className="text-xs text-muted-foreground mt-1">folyamatban</p>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CalendarPlus className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Határidők</span>
                </div>
                <p className="text-3xl font-display font-bold">{upcomingDeadlines.length}</p>
                <p className="text-xs text-muted-foreground mt-1">közelgő</p>
              </div>
            </div>

            {/* Welcome Section */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 md:p-12 text-white">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Üdv újra, {profile?.name?.split(" ").pop()}!
              </h2>
              <p className="text-lg text-white/90 mb-8 max-w-2xl">
                Kövesd az osztályok haladását, készíts személyre szabott feladatokat és tartsd mozgásban a diákok kreativitását.
              </p>
              {lastSyncedAt && (
                <p className="text-xs uppercase tracking-[0.4em] text-white/70 mb-6">
                  Utolsó szinkron: {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true, locale: hu })}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => router.push('/teacher/assignment/create')}
                  className="bg-white text-primary hover:bg-white/90"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Új AI feladat
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/teacher/assignments')}
                  className="border-white/30 text-black hover:bg-white/10"
                >
                  <ListChecks className="mr-2 h-5 w-5" />
                  Feladatok megtekintése
                </Button>
              </div>
            </div>

            {/* Charts and Assignments Grid */}
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-card rounded-2xl p-6 border border-border/40">
                <h3 className="text-lg font-semibold mb-2">Aktuális feladatok</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  A legújabb kijelölések státuszai és következő lépései.
                </p>
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
                    assignments.slice(0, 5).map((assignment) => (
                      <div
                        key={assignment.id}
                        className="mb-4 rounded-[1.75rem] border border-border/50 bg-white/80 p-5 shadow-sm"
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
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border/40">
                <h3 className="text-lg font-semibold mb-2">Kiemelt osztály</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Válaszd ki, melyik csoportot figyeled.
                </p>
                <div className="space-y-4">
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
                    <div className="rounded-2xl border border-border/50 bg-muted/40 p-4 text-sm space-y-2">
                      <p className="font-semibold text-foreground">{selectedClass.name}</p>
                      <p className="text-muted-foreground">Átlag szint: {selectedClass.averageLevel}</p>
                      <p className="text-muted-foreground">Teljesítés: {Math.round(selectedClass.completionRate * 100)}%</p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 pt-6 border-t border-border/40">
                  <h4 className="text-sm font-semibold mb-3">Gyorsműveletek</h4>
                  <div className="grid gap-2">
                    <Button variant="outline" className="justify-start" onClick={() => router.push('/teacher/assignment/create')}>
                      <ListChecks className="mr-2 size-4" />
                      Új feladatlap
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={() => setActiveView('classes')}>
                      <Users className="mr-2 size-4" />
                      Osztály kezelése
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={() => setActiveView('analytics')}>
                      <TrendingUp className="mr-2 size-4" />
                      Elemzések megtekintése
                    </Button>
                  </div>
                </div>
              </div>
            </div>

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
                icon={<Award className="size-5" />}
              />
              <MetricCard
                title="Közelgő határidők"
                value={`${upcomingDeadlines.length}`}
                description="7 napon belül esedékes"
                icon={<CalendarPlus className="size-5" />}
              />
            </div>
          </div>
        )}

        {activeView === 'classes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-display font-bold mb-2">Osztályok</h2>
              <p className="text-muted-foreground">
                Kezeld az osztályaidat, hívj meg diákokat és kövesd a haladásukat.
              </p>
            </div>
            <ClassesManagement teacherId={profile.id} />
          </div>
        )}

        {activeView === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-display font-bold mb-2">Elemzések</h2>
              <p className="text-muted-foreground">
                Részletes statisztikák az osztályok teljesítményéről.
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Elemzések</CardTitle>
                <CardDescription>Részletes statisztikák az osztályok teljesítményéről.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {activeView === 'assignments' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-display font-bold mb-2">Feladatok</h2>
              <p className="text-muted-foreground">
                Kezeld a kiadott és piszkozat feladatokat.
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Feladatok</CardTitle>
                <CardDescription>Kezeld a kiadott és piszkozat feladatokat.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {activeView === 'students' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-display font-bold mb-2">Diákok</h2>
              <p className="text-muted-foreground">
                Diákok listája és egyéni fejlődésük.
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Diákok</CardTitle>
                <CardDescription>Diákok listája és egyéni fejlődésük.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TeacherPortalPage() {
  return (
    <RequireAuth role="teacher">
      <TeacherPortalPageInner />
    </RequireAuth>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  const lineBase = "absolute left-0 h-0.5 w-full rounded-full bg-current transition-all duration-300";

  return (
    <span className="relative block h-4 w-5">
      <span
        className={cn(
          lineBase,
          open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
        )}
      />
      <span
        className={cn(
          lineBase,
          open ? "opacity-0" : "top-1/2 -translate-y-1/2"
        )}
      />
      <span
        className={cn(
          lineBase,
          open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"
        )}
      />
    </span>
  );
}
