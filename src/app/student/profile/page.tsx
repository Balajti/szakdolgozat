"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  Flame,
  Loader2,
  Mail,
  Trophy,
  TrendingUp,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RequireAuth } from "@/components/providers/require-auth";
import { useAvatarUrl } from "@/hooks/use-avatar-url";

interface BadgeItem {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  isUnlocked: boolean;
  achievedAt?: string;
}

interface ProfileData {
  id: string;
  name: string;
  email: string;
  birthday?: string;
  avatarUrl?: string;
  level: string;
  streak: number;
  vocabularyCount: number;
  currentStreak?: number;
  longestStreak?: number;
  totalStoriesRead?: number;
}

interface VocabularyStats {
  total: number;
  known: number;
  unknown: number;
  learning: number;
}

function StudentProfilePageInner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [vocabStats, setVocabStats] = useState<VocabularyStats>({
    total: 0,
    known: 0,
    unknown: 0,
    learning: 0,
  });

  // Fetch signed URL for avatar
  const avatarUrl = useAvatarUrl(profile?.avatarUrl);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const { client } = await import("@/lib/amplify-client");

        // Get current user
        const { getCurrentUser } = await import("aws-amplify/auth");
        const user = await getCurrentUser();

        // Load profile
        const getProfileQuery = /* GraphQL */ `
          query GetStudentProfile($id: ID!) {
            getStudentProfile(id: $id) {
              id
              name
              email
              birthday
              avatarUrl
              level
              streak
              vocabularyCount
              currentStreak
              longestStreak
              totalStoriesRead
            }
          }
        `;

        const profileResponse = await client.graphql({
          query: getProfileQuery,
          variables: { id: user.userId },
        }) as { data: { getStudentProfile: ProfileData } };

        if (profileResponse.data?.getStudentProfile) {
          setProfile(profileResponse.data.getStudentProfile);
        }

        // Load vocabulary stats
        const listWordsQuery = /* GraphQL */ `
          query ListWordsByStudent($studentId: ID!) {
            listWordsByStudent(studentId: $studentId) {
              items {
                id
                text
                mastery
              }
            }
          }
        `;

        const wordsResponse = await client.graphql({
          query: listWordsQuery,
          variables: { studentId: user.userId },
        }) as { data: { listWordsByStudent: { items: Array<{ mastery?: string }> } } };

        if (wordsResponse.data?.listWordsByStudent?.items) {
          const words = wordsResponse.data.listWordsByStudent.items;
          const known = words.filter((w) => w.mastery === "known").length;
          const unknown = words.filter((w) => w.mastery === "unknown").length;
          const learning = words.filter((w) => w.mastery === "learning").length;

          setVocabStats({
            total: words.length,
            known,
            unknown,
            learning,
          });
        }

        // Load badges
        const checkBadgesQuery = /* GraphQL */ `
          mutation CheckBadges($studentId: ID!) {
            checkBadges(studentId: $studentId) {
              allBadges
            }
          }
        `;

        const badgesResponse = await client.graphql({
          query: checkBadgesQuery,
          variables: { studentId: user.userId },
        }) as { data: { checkBadges: { allBadges: string } } };

        if (badgesResponse.data?.checkBadges?.allBadges) {
          let badgeData = badgesResponse.data.checkBadges.allBadges;

          if (typeof badgeData === "string") {
            badgeData = JSON.parse(badgeData);
          }
          if (typeof badgeData === "string") {
            badgeData = JSON.parse(badgeData);
          }

          if (Array.isArray(badgeData)) {
            // Filter badges that are either unlocked or have progress > 0
            const activeBadges = badgeData.filter(
              (b: BadgeItem) => b.isUnlocked || b.progress > 0
            );
            setBadges(activeBadges);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading profile data:", error);
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Nincs megadva";
    const date = new Date(dateString);
    return date.toLocaleDateString("hu-HU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
          <Button onClick={() => router.push("/student")} className="mt-4">
            Vissza a főoldalra
          </Button>
        </div>
      </div>
    );
  }

  const unlockedBadges = badges.filter((b) => b.isUnlocked);
  const inProgressBadges = badges.filter((b) => !b.isUnlocked && b.progress > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/student")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground sm:text-2xl">
                Profil
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Személyes adatok és statisztikák
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
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
                    <AvatarImage src={avatarUrl || undefined} />
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
                        {profile.birthday && (
                          <div className="flex items-center justify-center gap-2 sm:justify-start">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(profile.birthday)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                      <Badge variant="default" className="px-3 py-1">
                        <Trophy className="mr-1.5 h-3.5 w-3.5" />
                        Szint: {profile.level}
                      </Badge>
                      <Badge variant="default" className="px-3 py-1">
                        <Flame className="mr-1.5 h-3.5 w-3.5" />
                        {profile.currentStreak || profile.streak} napos sorozat
                      </Badge>
                      {unlockedBadges.length > 0 && (
                        <Badge variant="default" className="px-3 py-1">
                          <Award className="mr-1.5 h-3.5 w-3.5" />
                          {unlockedBadges.length} jelvény
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/student?view=settings")}
                    className="w-full sm:w-auto"
                  >
                    Profil szerkesztése
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
                <CardTitle className="text-sm font-medium">Tanult szavak</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{vocabStats.known}</div>
                <p className="text-xs text-muted-foreground">
                  {vocabStats.total} szóból
                </p>
                <Progress
                  value={vocabStats.total > 0 ? (vocabStats.known / vocabStats.total) * 100 : 0}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tanulás alatt</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">{vocabStats.learning}</div>
                <p className="text-xs text-muted-foreground">
                  {vocabStats.total > 0
                    ? Math.round((vocabStats.learning / vocabStats.total) * 100)
                    : 0}
                  % folyamatban
                </p>
                <Progress
                  value={vocabStats.total > 0 ? (vocabStats.learning / vocabStats.total) * 100 : 0}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ismeretlen szavak</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary">{vocabStats.unknown}</div>
                <p className="text-xs text-muted-foreground">
                  Még feldolgozásra vár
                </p>
                <Progress
                  value={vocabStats.total > 0 ? (vocabStats.unknown / vocabStats.total) * 100 : 0}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Leghosszabb sorozat</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {profile.longestStreak || profile.streak}
                </div>
                <p className="text-xs text-muted-foreground">
                  Nap egymás után
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Badges Section */}
          {badges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Jelvények és Eredmények
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Unlocked Badges */}
                  {unlockedBadges.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-sm font-semibold text-foreground">
                        Megszerzett jelvények ({unlockedBadges.length})
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {unlockedBadges.map((badge) => (
                          <div
                            key={badge.id}
                            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl">
                              {badge.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-foreground">
                                {badge.title}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {badge.description}
                              </p>
                              {badge.achievedAt && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatDate(badge.achievedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* In Progress Badges */}
                  {inProgressBadges.length > 0 && (
                    <div>
                      <h3 className="mb-4 text-sm font-semibold text-foreground">
                        Folyamatban ({inProgressBadges.length})
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {inProgressBadges.map((badge) => (
                          <div
                            key={badge.id}
                            className="rounded-lg border border-border bg-card p-4 shadow-sm"
                          >
                            <div className="mb-3 flex items-start gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-2xl opacity-60">
                                {badge.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-foreground">
                                  {badge.title}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {badge.description}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Előrehaladás</span>
                                <span className="font-medium">
                                  {badge.progress} / {badge.target}
                                </span>
                              </div>
                              <Progress
                                value={(badge.progress / badge.target) * 100}
                                className="h-2"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Additional Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Tanulási statisztikák</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Elolvasott történetek</p>
                      <p className="text-xs text-muted-foreground">Összesen</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {profile.totalStoriesRead || 0}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                      <Trophy className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Szókincs méret</p>
                      <p className="text-xs text-muted-foreground">
                        Tanult és tanulás alatt
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {vocabStats.known + vocabStats.learning}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
                      <Flame className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Jelenlegi sorozat</p>
                      <p className="text-xs text-muted-foreground">
                        Folyamatos napok
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {profile.currentStreak || profile.streak}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function StudentProfilePage() {
  return (
    <RequireAuth role="student">
      <StudentProfilePageInner />
    </RequireAuth>
  );
}
