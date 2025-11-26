"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import InteractiveStoryReader from "@/components/story/interactive-story-reader";
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
  highlightedWords?: string | Array<{ word: string; offset: number; length: number }>;
  unknownWordIds?: string[];
}

function StoryReaderPageInner() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [unknownWords, setUnknownWords] = useState<string[]>([]);
  const [highlightedWords, setHighlightedWords] = useState<string[]>([]);

  useEffect(() => {
    async function loadStory() {
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
          toast({
            title: "Hiba",
            description: "A történet nem található.",
            variant: "destructive",
          });
          router.push("/student");
        }
      } catch (error) {
        console.error("Error loading story:", error);
        toast({
          title: "Hiba",
          description: "Nem sikerült betölteni a történetet.",
          variant: "destructive",
        });
        router.push("/student");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadStory();
    }
  }, [params.id, router, toast]);

  const handleMarkUnknown = async (word: string) => {
    // Word is already saved in interactive-story-reader with full translation
    // Just show the toast confirmation
    toast({
      title: "Szó hozzáadva",
      description: `"${word}" hozzáadva az ismeretlen szavakhoz.`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!story) {
    return null;
  }

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
                {story.level && <span>Szint: {story.level}</span>}
                {story.difficulty && <span>• {story.difficulty}</span>}
                {story.topic && <span>• {story.topic}</span>}
                <span>• {new Date(story.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container max-w-4xl mx-auto px-6 py-8">
        <div className="bg-card rounded-2xl border border-border/40 p-8">
          <InteractiveStoryReader
            content={story.content}
            highlightedWords={highlightedWords}
            unknownWords={unknownWords}
            learningWords={[]}
            onMarkUnknown={handleMarkUnknown}
            targetLanguage="hu"
          />
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
