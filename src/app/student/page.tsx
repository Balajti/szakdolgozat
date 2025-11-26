"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { differenceInYears } from "date-fns";
import {
  BookOpen,
  Flame,
  Library,
  Trophy,
  Plus,
  Loader2,
  LogOut,
  Sparkles,
  Award,
  Settings,
  TrendingUp
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStudentDashboard } from "@/lib/hooks/use-student-dashboard";
import { RequireAuth } from "@/components/providers/require-auth";
import { VocabularyQuickList } from "@/components/student/vocabulary-quick-list";
import { RecentStories } from "@/components/student/recent-stories";
import { BadgesDisplay } from "@/components/student/badges-display";
import { VocabularyList } from "@/components/student/vocabulary-list";
import { StoryPreferences } from "@/components/student/story-preferences";
import { ProfileSettings } from "@/components/student/profile-settings";
import { StoryGenerationModal } from "@/components/story/story-generation-modal";
import { useToast } from "@/hooks/use-toast";
import { LogoutButton } from "@/components/ui/logout-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAvatarUrl } from "@/hooks/use-avatar-url";

const dashboardNavItems = [
  { value: 'overview' as const, label: 'Áttekintés', icon: TrendingUp },
  { value: 'library' as const, label: 'Könyvtár', icon: Library },
  { value: 'vocabulary' as const, label: 'Szókincs', icon: BookOpen },
  { value: 'achievements' as const, label: 'Eredmények', icon: Award },
  { value: 'settings' as const, label: 'Beállítások', icon: Settings },
];

type DashboardView = typeof dashboardNavItems[number]['value'];

function StudentPortalPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isLoading } = useStudentDashboard();
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const [isGeneratingSurprise, setIsGeneratingSurprise] = useState(false);
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { toast } = useToast();

  // Fetch signed URL for avatar
  const avatarUrl = useAvatarUrl(data?.profile?.avatarUrl);

  // Handle query parameter for view navigation
  useEffect(() => {
    const view = searchParams.get('view') as DashboardView;
    if (view && dashboardNavItems.some(item => item.value === view)) {
      setActiveView(view);
    }
  }, [searchParams]);

  const handleViewChange = (view: DashboardView) => {
    setActiveView(view);
    setIsMobileNavOpen(false);
  };

  const handleGenerateStory = async (level: string) => {
    if (!data?.profile) return;

    try {
      const { client } = await import('@/lib/amplify-client');

      // Update profile level if changed
      if (data?.profile && data.profile.level !== level) {
        const updateProfileMutation = /* GraphQL */ `
          mutation UpdateStudentProfile($input: UpdateStudentProfileInput!) {
            updateStudentProfile(input: $input) {
              id
              level
            }
          }
        `;

        await client.graphql({
          query: updateProfileMutation,
          variables: {
            input: {
              id: data.profile.id,
              level: level
            }
          }
        });
      }

      const age = data?.profile?.birthday
        ? differenceInYears(new Date(), new Date(data.profile.birthday))
        : 12;

      // Fetch student preferences for topic selection
      const getPreferencesQuery = /* GraphQL */ `
        query GetStudentPreferences($id: ID!) {
          getStudentProfile(id: $id) {
            id
            preferredTopics
            useRandomTopics
            preferredDifficulty
          }
        }
      `;

      const preferencesResponse = await client.graphql({
        query: getPreferencesQuery,
        variables: { id: data.profile.id }
      }) as { data: { getStudentProfile: { preferredTopics?: (string | null)[]; useRandomTopics?: boolean; preferredDifficulty?: string } } };

      // Determine topic based on preferences
      let selectedTopic: string | undefined = undefined;
      const preferences = preferencesResponse.data?.getStudentProfile;

      if (preferences && !preferences.useRandomTopics && preferences.preferredTopics && preferences.preferredTopics.length > 0) {
        // Filter out null values and randomly select from preferred topics
        const validTopics = preferences.preferredTopics.filter((t): t is string => t !== null && t !== undefined);
        if (validTopics.length > 0) {
          selectedTopic = validTopics[Math.floor(Math.random() * validTopics.length)];
        }
      }
      // If useRandomTopics is true or no topics selected, don't pass a topic (AI will choose randomly)

      // Fetch student's vocabulary
      const listWordsQuery = /* GraphQL */ `
        query ListWordsByStudent($studentId: ID!) {
          listWordsByStudent(studentId: $studentId) {
            items {
              text
              mastery
            }
          }
        }
      `;

      const wordsResponse = await client.graphql({
        query: listWordsQuery,
        variables: { studentId: data.profile.id }
      }) as { data: { listWordsByStudent: { items: { text: string; mastery: string }[] } } };

      const allWords = wordsResponse.data?.listWordsByStudent?.items || [];
      const knownWords = allWords
        .filter(w => w.mastery === 'known')
        .map(w => w.text);
      const unknownWords = allWords
        .filter(w => w.mastery === 'unknown')
        .map(w => w.text);

      const generateStoryMutation = /* GraphQL */ `
        mutation GenerateStory(
          $level: String!
          $age: Int
          $knownWords: [String]
          $unknownWords: [String]
          $mode: StoryGenerationMode!
          $topic: String
          $difficulty: String
        ) {
          generateStory(
            level: $level
            age: $age
            knownWords: $knownWords
            unknownWords: $unknownWords
            mode: $mode
            topic: $topic
            difficulty: $difficulty
          ) {
            story {
              id
              title
              content
              level
              createdAt
            }
            newWords {
              id
              text
              translation
            }
          }
        }
      `;

      const response = await client.graphql({
        query: generateStoryMutation,
        variables: {
          level,
          age,
          knownWords,
          unknownWords,
          mode: "personalized",
          topic: selectedTopic, // Pass the selected topic
          difficulty: preferences?.preferredDifficulty, // Pass the preferred difficulty
        }
      }) as { data: { generateStory: { story: { id: string } } } };

      if (response.data?.generateStory?.story) {
        const storyId = response.data.generateStory.story.id;
        toast({
          title: "Történet generálva!",
          description: "Az új történeted elkészült.",
        });
        setIsGenerationModalOpen(false);
        // Navigate to the newly generated story
        router.push(`/student/story/${storyId}`);
      } else {
        throw new Error("No story returned from generation");
      }
    } catch (error) {
      console.error("Error generating story:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült a történet generálása. Kérlek, próbáld újra.",
        variant: "destructive",
      });
    }
  };

  const handleSurpriseMe = async () => {
    if (!data?.profile) return;

    setIsGeneratingSurprise(true);
    try {
      const { client } = await import('@/lib/amplify-client');

      const age = data?.profile?.birthday
        ? differenceInYears(new Date(), new Date(data.profile.birthday))
        : 12;

      // Fetch student preferences for difficulty only (topic will be random)
      const getPreferencesQuery = /* GraphQL */ `
        query GetStudentPreferences($id: ID!) {
          getStudentProfile(id: $id) {
            id
            preferredDifficulty
          }
        }
      `;

      const preferencesResponse = await client.graphql({
        query: getPreferencesQuery,
        variables: { id: data.profile.id }
      }) as { data: { getStudentProfile: { preferredDifficulty?: string } } };

      const preferences = preferencesResponse.data?.getStudentProfile;

      // Fetch student's vocabulary
      const listWordsQuery = /* GraphQL */ `
        query ListWordsByStudent($studentId: ID!) {
          listWordsByStudent(studentId: $studentId) {
            items {
              text
              mastery
            }
          }
        }
      `;

      const wordsResponse = await client.graphql({
        query: listWordsQuery,
        variables: { studentId: data.profile.id }
      }) as { data: { listWordsByStudent: { items: { text: string; mastery: string }[] } } };

      const allWords = wordsResponse.data?.listWordsByStudent?.items || [];
      const knownWords = allWords
        .filter(w => w.mastery === 'known')
        .map(w => w.text);
      const unknownWords = allWords
        .filter(w => w.mastery === 'unknown')
        .map(w => w.text);

      const generateStoryMutation = /* GraphQL */ `
        mutation GenerateStory(
          $level: String!
          $age: Int
          $knownWords: [String]
          $unknownWords: [String]
          $mode: StoryGenerationMode!
          $topic: String
          $difficulty: String
        ) {
          generateStory(
            level: $level
            age: $age
            knownWords: $knownWords
            unknownWords: $unknownWords
            mode: $mode
            topic: $topic
            difficulty: $difficulty
          ) {
            story {
              id
              title
              content
              level
              createdAt
            }
            newWords {
              id
              text
              translation
            }
          }
        }
      `;

      const response = await client.graphql({
        query: generateStoryMutation,
        variables: {
          level: data.profile.level,
          age,
          knownWords,
          unknownWords,
          mode: "personalized",
          topic: undefined, // Random topic - do not pass user's preference
          difficulty: preferences?.preferredDifficulty,
        }
      }) as { data: { generateStory: { story: { id: string } } } };

      if (response.data?.generateStory?.story) {
        const storyId = response.data.generateStory.story.id;
        toast({
          title: "Történet generálva!",
          description: "Az új meglepetés történeted elkészült.",
        });
        // Navigate to the newly generated story
        router.push(`/student/story/${storyId}`);
      } else {
        throw new Error("No story returned from generation");
      }
    } catch (error) {
      console.error("Error generating surprise story:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült a történet generálása. Kérlek, próbáld újra.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSurprise(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const profile = data?.profile;

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
                <Button onClick={() => setIsGenerationModalOpen(true)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Új történet
                </Button>
                <button
                  onClick={() => router.push('/student/profile')}
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
                    <Button onClick={() => setIsGenerationModalOpen(true)} className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      Új történet
                    </Button>
                    <button
                      onClick={() => {
                        router.push('/student/profile');
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
                    <Flame className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Sorozat</span>
                </div>
                <p className="text-3xl font-display font-bold">{profile?.streak || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">nap</p>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Library className="h-5 w-5 text-accent" />
                  </div>
                  <span className="text-sm text-muted-foreground">Szavak</span>
                </div>
                <p className="text-3xl font-display font-bold">{profile?.vocabularyCount || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">elsajátítva</p>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <BookOpen className="h-5 w-5 text-secondary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Történetek</span>
                </div>
                <p className="text-3xl font-display font-bold">{profile?.stories?.length || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">teljesítve</p>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">Szint</span>
                </div>
                <p className="text-3xl font-display font-bold">{profile?.level || "A1"}</p>
                <p className="text-xs text-muted-foreground mt-1">jelenlegi</p>
              </div>
            </div>

            {/* Welcome Section */}
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 md:p-12 text-white">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Üdv újra, {profile?.name?.split(" ").pop()}!
              </h2>
              <p className="text-lg text-white/90 mb-8 max-w-2xl">
                Készen állsz a nyelvtanulási utad folytatására? Generálj egy új történetet, vagy folytasd, ahol abbahagytad.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => setIsGenerationModalOpen(true)}
                  className="bg-white text-primary hover:bg-white/90"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Történet generálása
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleSurpriseMe}
                  disabled={isGeneratingSurprise}
                  className="border-white/30 text-black hover:bg-white/10"
                >
                  {isGeneratingSurprise ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generálás...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Lepj meg
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Charts and Stories Grid */}
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-card rounded-2xl p-6 border border-border/40">
                <h3 className="text-lg font-semibold mb-2">Szókincs gyorslista</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  A legutóbb jelölt ismeretlen szavak és fordításaik.
                </p>
                <VocabularyQuickList studentId={profile?.id || ""} limit={6} />
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border/40">
                <h3 className="text-lg font-semibold mb-6">Legutóbbi történetek</h3>
                <RecentStories
                  studentId={profile?.id || ""}
                  onSelectStory={(story) => {
                    router.push(`/student/story/${story.id}`);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {activeView === 'library' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-display font-bold mb-2">Történet könyvtár</h2>
              <p className="text-muted-foreground">
                Böngéssz az összes generált történet között és látogasd meg újra a kedvenceid.
              </p>
            </div>
            <RecentStories
              studentId={profile?.id || ""}
              onSelectStory={(story) => {
                router.push(`/student/story/${story.id}`);
              }}
            />
          </div>
        )}

        {activeView === 'vocabulary' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-display font-bold mb-2">Szókincs</h2>
              <p className="text-muted-foreground">
                Tekintsd meg az ismeretlen és tanult szavaidat fordításokkal együtt.
              </p>
            </div>
            <VocabularyList studentId={profile?.id || ""} />
          </div>
        )}

        {activeView === 'achievements' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-display font-bold mb-2">Eredmények</h2>
              <p className="text-muted-foreground">
                Kövesd nyomon a fejlődésed és szerezz jelvényeket tanulás közben.
              </p>
            </div>
            <BadgesDisplay studentId={profile?.id || ""} />
          </div>
        )}

        {activeView === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-display font-bold mb-2">Beállítások</h2>
              <p className="text-muted-foreground">
                Szabd személyre a fiókodat és a tanulási élményed.
              </p>
            </div>

            <ProfileSettings studentId={profile?.id || ""} />

            <div className="pt-6">
              <h3 className="text-xl font-semibold mb-4">Történet preferenciák</h3>
              <StoryPreferences
                studentId={profile?.id || ""}
                onSave={() => toast({ title: "Beállítások mentve", description: "A történet preferenciáid sikeresen frissítve." })}
              />
            </div>
          </div>
        )}
      </main>

      <StoryGenerationModal
        isOpen={isGenerationModalOpen}
        onClose={() => setIsGenerationModalOpen(false)}
        onGenerate={handleGenerateStory}
        currentLevel={profile?.level || "A1"}
      />
    </div>
  );
}

export default function StudentPortalPage() {
  return (
    <RequireAuth role="student">
      <StudentPortalPageInner />
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
