"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Mail,
  Users,
  TrendingUp,
  User,
  GraduationCap,
  Building2,
  Settings,
  UserCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequireAuth } from "@/components/providers/require-auth";
import { TeacherProfileSettings } from "@/components/teacher/profile-settings";

interface TeacherProfileData {
  id: string;
  name: string;
  email: string;
  school?: string;
  bio?: string;
  avatarUrl?: string;
}

interface TeacherStats {
  totalStudents: number;
  totalClasses: number;
  totalAssignments: number;
  activeAssignments: number;
}

function TeacherProfilePageInner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TeacherProfileData | null>(null);
  const [stats, setStats] = useState<TeacherStats>({
    totalStudents: 0,
    totalClasses: 0,
    totalAssignments: 0,
    activeAssignments: 0,
  });

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const { client } = await import("@/lib/amplify-client");

        // Get current user
        const { getCurrentUser } = await import("aws-amplify/auth");
        const user = await getCurrentUser();

        // Load profile
        const getProfileQuery = /* GraphQL */ `
          query GetTeacherProfile($id: ID!) {
            getTeacherProfile(id: $id) {
              id
              name
              email
              school
              bio
              avatarUrl
            }
          }
        `;

        const profileResponse = await client.graphql({
          query: getProfileQuery,
          variables: { id: user.userId },
        }) as { data: { getTeacherProfile: TeacherProfileData } };

        if (profileResponse.data?.getTeacherProfile) {
          setProfile(profileResponse.data.getTeacherProfile);
        }

        // Load teacher dashboard data for stats
        const teacherDashboardQuery = /* GraphQL */ `
          query TeacherDashboard {
            teacherDashboard {
              profile
              classes
              assignments
            }
          }
        `;

        const dashboardResponse = await client.graphql({
          query: teacherDashboardQuery,
        }) as {
          data: {
            teacherDashboard: {
              classes?: string;
              assignments?: string;
            };
          };
        };

        if (dashboardResponse.data?.teacherDashboard) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let classes: any[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let assignments: any[] = [];

          // Parse classes
          if (dashboardResponse.data.teacherDashboard.classes) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let classesData: any = dashboardResponse.data.teacherDashboard.classes;
            if (typeof classesData === "string") {
              classesData = JSON.parse(classesData);
            }
            if (typeof classesData === "string") {
              classesData = JSON.parse(classesData);
            }
            if (Array.isArray(classesData)) {
              classes = classesData;
            }
          }

          // Parse assignments
          if (dashboardResponse.data.teacherDashboard.assignments) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let assignmentsData: any = dashboardResponse.data.teacherDashboard.assignments;
            if (typeof assignmentsData === "string") {
              assignmentsData = JSON.parse(assignmentsData);
            }
            if (typeof assignmentsData === "string") {
              assignmentsData = JSON.parse(assignmentsData);
            }
            if (Array.isArray(assignmentsData)) {
              assignments = assignmentsData;
            }
          }

          const totalStudents = classes.reduce(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (sum: number, cls: any) => sum + (cls.studentCount || 0),
            0
          );
          const activeAssignments = assignments.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (a: any) => a.status === "sent"
          ).length;

          setStats({
            totalStudents,
            totalClasses: classes.length,
            totalAssignments: assignments.length,
            activeAssignments,
          });
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading profile data:", error);
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Nem található profil</p>
          <Button onClick={() => router.push("/teacher")} className="mt-4">
            Vissza a főoldalra
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/teacher")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground sm:text-2xl">
                Tanári Profil
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Személyes adatok és beállítások
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">
              <UserCircle className="mr-2 h-4 w-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Beállítások
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 sm:space-y-8">
          {/* Profile Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-xl sm:h-32 sm:w-32">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-3xl sm:text-4xl">
                      {profile.name?.charAt(0) || <User className="h-12 w-12 sm:h-16 sm:w-16" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4 text-center sm:text-left">
                    <div>
                      <h2 className="text-2xl font-display font-bold text-foreground sm:text-3xl">
                        {profile.name}
                      </h2>
                      <div className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-4">
                        <div className="flex items-center justify-center gap-2 sm:justify-start">
                          <Mail className="h-4 w-4" />
                          <span>{profile.email}</span>
                        </div>
                        {profile.school && (
                          <div className="flex items-center justify-center gap-2 sm:justify-start">
                            <Building2 className="h-4 w-4" />
                            <span>{profile.school}</span>
                          </div>
                        )}
                      </div>
                      {profile.bio && (
                        <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
                          {profile.bio}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                      <Badge variant="outline" className="px-3 py-1">
                        <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                        Tanár
                      </Badge>
                      <Badge variant="outline" className="px-3 py-1">
                        <Users className="mr-1.5 h-3.5 w-3.5" />
                        {stats.totalStudents} diák
                      </Badge>
                      <Badge variant="outline" className="px-3 py-1">
                        <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                        {stats.totalClasses} osztály
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/teacher")}
                    className="w-full sm:w-auto"
                  >
                    Vissza az irányítópulthoz
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Összes diák</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{stats.totalStudents}</div>
                <p className="text-xs text-muted-foreground">
                  Minden osztályban
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Osztályok</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">{stats.totalClasses}</div>
                <p className="text-xs text-muted-foreground">
                  Aktív osztályok
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Feladatok</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary">{stats.totalAssignments}</div>
                <p className="text-xs text-muted-foreground">
                  Összes feladat
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktív feladatok</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {stats.activeAssignments}
                </div>
                <p className="text-xs text-muted-foreground">
                  Folyamatban
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Teacher Information Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Tanári információk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Diákok száma</p>
                      <p className="text-xs text-muted-foreground">Az összes osztályban</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {stats.totalStudents}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                      <BookOpen className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Kiadott feladatok</p>
                      <p className="text-xs text-muted-foreground">
                        Történetek és kvízek
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {stats.totalAssignments}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                      <TrendingUp className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Folyamatban lévő</p>
                      <p className="text-xs text-muted-foreground">
                        Aktív feladatok száma
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {stats.activeAssignments}
                  </div>
                </div>

                {profile.school && (
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                        <Building2 className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Intézmény</p>
                        <p className="text-xs text-muted-foreground">
                          Munkahely
                        </p>
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                      {profile.school}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TeacherProfileSettings teacherId={profile.id} />
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function TeacherProfilePage() {
  return (
    <RequireAuth role="teacher">
      <TeacherProfilePageInner />
    </RequireAuth>
  );
}
