"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import InteractiveStoryReader from "@/components/story/interactive-story-reader";
import { DifficultyAdjuster } from "@/components/story/difficulty-adjuster";
import { TextToSpeech } from "@/components/common/text-to-speech";
import { ErrorCard } from "@/components/ui/error-card";
import { useToast } from "@/hooks/use-toast";
import { RequireAuth } from "@/components/providers/require-auth";

interface Story {
  id: string;
  title: string;
  content: string;
  level?: string;
  difficulty?: string;
  topic?: string;
  createdAt: string;
  studentId?: string;
  readCount?: number | null;
  highlightedWords?: string | Array<{ word: string; offset: number; length: number }>;
  unknownWordIds?: string[];
}

function StoryReaderPageInner() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [unknownWords, setUnknownWords] = useState<string[]>([]);
  const [highlightedWords, setHighlightedWords] = useState<string[]>([]);
  // Adjusted (simplified/complexified) text is display-only, the stored story stays intact
  const [displayContent, setDisplayContent] = useState<string | null>(null);
  const [displayLevel, setDisplayLevel] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [newBadges, setNewBadges] = useState<Array<{ title: string; icon: string }>>([]);

  const loadStory = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { client } = await import("@/lib/amplify-client");

      const getStoryQuery = /* GraphQL */ `
          query GetStory($id: ID!) {
            getStory(id: $id) {
              id
              title
              content
              level
              difficulty
              topic
              createdAt
              studentId
              readCount
              highlightedWords
              unknownWordIds
            }
          }
        `;

      const response = await client.graphql({
        query: getStoryQuery,
        variables: { id: params.id },
      }) as { data: { getStory: Story } };

      if (response.data?.getStory) {
        const storyData = response.data.getStory;
        setStory(storyData);

        // Target words highlighting removed per user request
        setHighlightedWords([]);

        // Fetch all unknown words for the student to highlight them
        if (storyData.studentId) {
          const listWordsQuery = /* GraphQL */ `
              query ListWordsByStudent($studentId: ID!) {
                listWordsByStudent(studentId: $studentId, filter: { mastery: { eq: unknown } }) {
                  items {
                    text
                  }
                }
              }
            `;

          const wordsResponse = await client.graphql({
            query: listWordsQuery,
            variables: { studentId: storyData.studentId }
          }) as { data: { listWordsByStudent: { items: { text: string }[] } } };

          const allUnknownWords = wordsResponse.data?.listWordsByStudent?.items || [];
          setUnknownWords(allUnknownWords.map(w => w.text));
        }
      } else {
        setLoadError(true);
      }
    } catch (error) {
      console.error("Error loading story:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      loadStory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleMarkUnknown = async (word: string) => {
    // Word is already saved in interactive-story-reader with full translation
    // Just show the toast confirmation
    toast({
      title: "Szó hozzáadva",
      description: `"${word}" hozzáadva az ismeretlen szavakhoz.`,
    });
  };

  const handleTextAdjusted = (adjustedText: string, newLevel: string) => {
    setDisplayContent(adjustedText);
    setDisplayLevel(newLevel);
  };

  const handleFinish = async () => {
    if (!story || finishing || finished) return;
    setFinishing(true);
    try {
      const { client } = await import("@/lib/amplify-client");
      const { fetchAuthSession } = await import("aws-amplify/auth");
      const session = await fetchAuthSession();
      const studentId = session.userSub;

      // Count this read on the story itself
      const updateStoryMutation = /* GraphQL */ `
        mutation UpdateStory($input: UpdateStoryInput!) {
          updateStory(input: $input) { id readCount }
        }
      `;
      await client.graphql({
        query: updateStoryMutation,
        variables: {
          input: { id: story.id, readCount: (story.readCount ?? 0) + 1 },
        },
      });

      if (studentId) {
        // Bump the student's finished-stories counter
        const getProfileQuery = /* GraphQL */ `
          query GetStudentProfile($id: ID!) {
            getStudentProfile(id: $id) { id totalStoriesRead }
          }
        `;
        const profileResponse = await client.graphql({
          query: getProfileQuery,
          variables: { id: studentId },
        }) as { data: { getStudentProfile: { id: string; totalStoriesRead?: number | null } | null } };

        const currentCount = profileResponse.data?.getStudentProfile?.totalStoriesRead ?? 0;
        const updateProfileMutation = /* GraphQL */ `
          mutation UpdateStudentProfile($input: UpdateStudentProfileInput!) {
            updateStudentProfile(input: $input) { id totalStoriesRead }
          }
        `;
        await client.graphql({
          query: updateProfileMutation,
          variables: { input: { id: studentId, totalStoriesRead: currentCount + 1 } },
        });

        // Refresh badges + daily progress snapshot; failures here shouldn't block the celebration
        try {
          const checkBadgesMutation = /* GraphQL */ `
            mutation CheckBadges($studentId: ID!) {
              checkBadges(studentId: $studentId) { newBadges allBadges }
            }
          `;
          const badgesResponse = await client.graphql({
            query: checkBadgesMutation,
            variables: { studentId },
          }) as { data: { checkBadges: { newBadges: string } } };

          const rawNewBadges = badgesResponse.data?.checkBadges?.newBadges;
          if (rawNewBadges) {
            const parsed = JSON.parse(rawNewBadges);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setNewBadges(parsed.map((b: { title: string; icon: string }) => ({ title: b.title, icon: b.icon })));
            }
          }

          const trackProgressMutation = /* GraphQL */ `
            mutation TrackVocabularyProgress($studentId: ID!) {
              trackVocabularyProgress(studentId: $studentId) { date knownWords }
            }
          `;
          await client.graphql({
            query: trackProgressMutation,
            variables: { studentId },
          });
        } catch (gamificationError) {
          console.error("Error refreshing badges/progress:", gamificationError);
        }
      }

      setFinished(true);
    } catch (error) {
      console.error("Error finishing story:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült elmenteni a befejezést. Próbáld újra.",
        variant: "destructive",
      });
    } finally {
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError || !story) {
    return (
      <ErrorCard
        fullPage
        title="A történet nem érhető el"
        description="Nem sikerült betölteni a történetet. Lehet, hogy törölve lett, vagy hálózati hiba történt."
        onRetry={loadStory}
      />
    );
  }

  const contentToShow = displayContent ?? story.content;
  const levelToShow = displayLevel ?? story.level ?? "A1";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-card">
        <div className="container max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/student")}
              className="gap-2 self-start"
            >
              <ArrowLeft className="h-4 w-4" />
              Vissza
            </Button>
            <div className="flex-1 w-full">
              <h1 className="text-2xl font-display font-bold">{story.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                <span>Szint: {levelToShow}</span>
                {displayLevel && <span className="text-primary">(átírt változat)</span>}
                {story.topic && <span>• {story.topic}</span>}
                <span>• {new Date(story.createdAt).toLocaleDateString("hu-HU")}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-center">
              <TextToSpeech text={contentToShow} language="en-US" label="Felolvasás" size="sm" />
            </div>
          </div>
        </div>
      </div>

      <main className="w-full md:container md:max-w-4xl md:mx-auto md:px-6 md:py-8 space-y-6 pb-10">
        {/* Difficulty adjuster */}
        <div className="px-4 pt-4 md:px-0 md:pt-0">
          <DifficultyAdjuster
            text={contentToShow}
            currentLevel={levelToShow}
            onTextAdjusted={handleTextAdjusted}
          />
        </div>

        <div className="bg-card md:rounded-2xl md:border md:border-border/40 p-4 md:p-8">
          <InteractiveStoryReader
            content={contentToShow}
            highlightedWords={highlightedWords}
            unknownWords={unknownWords}
            learningWords={[]}
            onMarkUnknown={handleMarkUnknown}
            targetLanguage="hu"
          />
        </div>

        {/* Finish reading */}
        <div className="px-4 md:px-0">
          {finished ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="text-5xl">🎉</div>
                  <div>
                    <h3 className="text-xl font-bold">Szép munka!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      A történet befejezése rögzítve — így nő a statisztikád és a sorozatod.
                    </p>
                  </div>
                  {newBadges.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Új jelvényt szereztél!</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {newBadges.map((badge) => (
                          <span
                            key={badge.title}
                            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800"
                          >
                            <span>{badge.icon}</span> {badge.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button onClick={() => router.push("/student")} className="gap-2">
                    Vissza az irányítópultra
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="flex justify-center">
              <Button size="lg" onClick={handleFinish} disabled={finishing} className="gap-2 px-8">
                {finishing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                Befejeztem a történetet
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function StoryReaderPage() {
  return (
    <RequireAuth role="student">
      <StoryReaderPageInner />
    </RequireAuth>
  );
}
