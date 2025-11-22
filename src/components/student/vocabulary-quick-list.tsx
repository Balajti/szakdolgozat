"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen } from "lucide-react";

interface WordSummary {
  id: string;
  text: string;
  translation: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  usageNotes?: string;
  mastery: "known" | "learning" | "unknown";
  createdAt: string;
}

interface VocabularyQuickListProps {
  studentId: string;
  limit?: number;
}

export function VocabularyQuickList({ studentId, limit = 5 }: VocabularyQuickListProps) {
  const [words, setWords] = useState<WordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWord, setSelectedWord] = useState<WordSummary | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const loadWords = async () => {
      if (!studentId) return;
      try {
        const { client } = await import("@/lib/amplify-client");

        const listWordsQuery = /* GraphQL */ `
          query ListWordsByStudent($studentId: ID!, $limit: Int) {
            listWordsByStudent(studentId: $studentId, limit: $limit) {
              items {
                id
                text
                translation
                partOfSpeech
                exampleSentence
                exampleTranslation
                usageNotes
                mastery
                createdAt
              }
            }
          }
        `;

        const response = await client.graphql({
          query: listWordsQuery,
          variables: { studentId, limit: 200 },
        }) as { data: { listWordsByStudent: { items: WordSummary[] } } };

        if (response.data?.listWordsByStudent?.items) {
          const sorted = response.data.listWordsByStudent.items
            .filter((word) => word.mastery === "unknown")
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);
          setWords(sorted);
        } else {
          setWords([]);
        }
      } catch (error) {
        console.error("Error loading quick vocabulary list:", error);
        setWords([]);
      } finally {
        setLoading(false);
      }
    };

    loadWords();
  }, [studentId, limit]);

  const handleOpenDetails = (word: WordSummary) => {
    setSelectedWord(word);
    setIsDialogOpen(true);
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-muted-foreground">Legutóbbi ismeretlen szavak</p>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {!loading && words.length === 0 && (
        <p className="text-sm text-muted-foreground">Még nem jelöltél ki ismeretlen szavakat.</p>
      )}

      <div className="space-y-2">
        {words.map((word) => (
          <div
            key={word.id}
            className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
          >
            <div>
              <p className="font-medium text-foreground capitalize">{word.text}</p>
              <p className="text-xs text-muted-foreground">Jelölve: {new Date(word.createdAt).toLocaleDateString("hu-HU")}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleOpenDetails(word)}
              className="hover:bg-primary/10"
              aria-label={`Fordítás megtekintése: ${word.text}`}
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md w-full h-[92vh] overflow-y-auto sm:max-w-lg sm:h-auto sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="capitalize">{selectedWord?.text}</span>
              {selectedWord?.partOfSpeech && (
                <Badge variant="outline">{selectedWord.partOfSpeech}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedWord && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Magyar fordítás</p>
                <p className="text-xl font-semibold text-foreground">{selectedWord.translation}</p>
              </div>

              {selectedWord.exampleSentence && (
                <div className="space-y-2">
                  <p className="text-sm italic text-foreground">{selectedWord.exampleSentence}</p>
                  {selectedWord.exampleTranslation && (
                    <p className="text-sm text-muted-foreground">📖 {selectedWord.exampleTranslation}</p>
                  )}
                </div>
              )}

              {selectedWord.usageNotes && (
                <div className="rounded-lg bg-accent/10 p-3 text-sm text-muted-foreground max-h-64 sm:max-h-40 overflow-y-auto pr-1">
                  {selectedWord.usageNotes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
