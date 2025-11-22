"use client";

import { useState } from "react";
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
import { VocabularyChart } from "@/components/student/vocabulary-chart";
import { RecentStories } from "@/components/student/recent-stories";
import { BadgesDisplay } from "@/components/student/badges-display";
import { StoryPreferences } from "@/components/student/story-preferences";
import { StoryGenerationModal } from "@/components/story/story-generation-modal";
import { useToast } from "@/hooks/use-toast";
import { LogoutButton } from "@/components/ui/logout-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function StudentPortalPageInner() {
  const { data, isLoading } = useStudentDashboard();
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'library' | 'achievements' | 'settings'>('overview');
  const { toast } = useToast();

  const handleGenerateStory = async (level: string) => {
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

      const generateStoryMutation = /* GraphQL */ `
        mutation GenerateStory(
          $level: String!
          $age: Int!
          $knownWords: [String!]!
          $unknownWords: [String!]!
          $mode: StoryGenerationMode!
        ) {
          generateStory(
            level: $level
            age: $age
            knownWords: $knownWords
            unknownWords: $unknownWords
            mode: $mode
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
          knownWords: [],
          unknownWords: [],
          mode: "personalized"
        }
      }) as { data: { generateStory: { story: { id: string } } } };

      if (response.data?.generateStory?.story) {
        toast({
          title: "Történet generálva!",
          description: "Az új történeted elkészült.",
        });
        setIsGenerationModalOpen(false);
        window.location.reload();
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-display font-bold text-foreground">WordNest</h1>
              <nav className="hidden md:flex gap-1">
                <Button 
                  variant={activeView === 'overview' ? 'default' : 'ghost'}
                  onClick={() => setActiveView('overview')}
                  className="gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Áttekintés
                </Button>
                <Button 
                  variant={activeView === 'library' ? 'default' : 'ghost'}
                  onClick={() => setActiveView('library')}
                  className="gap-2"
                >
                  <Library className="h-4 w-4" />
                  Könyvtár
                </Button>
                <Button 
                  variant={activeView === 'achievements' ? 'default' : 'ghost'}
                  onClick={() => setActiveView('achievements')}
                  className="gap-2"
                >
                  <Award className="h-4 w-4" />
                  Eredmények
                </Button>
                <Button 
                  variant={activeView === 'settings' ? 'default' : 'ghost'}
                  onClick={() => setActiveView('settings')}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Beállítások
                </Button>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <Button onClick={() => setIsGenerationModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Új történet
              </Button>
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {profile?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:block">{profile?.name?.split(" ")[0]}</span>
              </div>
              <LogoutButton variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
              </LogoutButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {activeView === 'overview' && (
          <div className="space-y-8">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                Üdv újra, {profile?.name?.split(" ")[0]}!
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
                  onClick={() => setIsGenerationModalOpen(true)}
                  className="border-white/30 text-black hover:bg-white/10"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Lepj meg
                </Button>
              </div>
            </div>

            {/* Charts and Stories Grid */}
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-card rounded-2xl p-6 border border-border/40">
                <h3 className="text-lg font-semibold mb-6">Szókincs fejlődés</h3>
                <VocabularyChart studentId={profile?.id || ""} />
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border/40">
                <h3 className="text-lg font-semibold mb-6">Legutóbbi történetek</h3>
                <RecentStories
                  studentId={profile?.id || ""}
                  onSelectStory={(story) => console.log("Selected story:", story.id)}
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
              onSelectStory={(story) => console.log("Selected story:", story.id)}
            />
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
                Szabd személyre a tanulási élményed és a történet preferenciáid.
              </p>
            </div>
            <StoryPreferences 
              studentId={profile?.id || ""} 
              onSave={() => toast({ title: "Beállítások mentve" })} 
            />
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
