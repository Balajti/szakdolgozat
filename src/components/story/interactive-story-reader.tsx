"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface WordTranslation {
  word: string;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  phonetic?: string;
  partOfSpeech?: string;
  pastTense?: string;
  futureTense?: string;
  pluralForm?: string;
  usageNotes?: string;
}

interface InteractiveStoryReaderProps {
  content: string;
  highlightedWords: string[];
  unknownWords: string[];
  learningWords: string[];
  onMarkUnknown?: (word: string) => Promise<void>;
  targetLanguage?: string;
}

export default function InteractiveStoryReader({
  content,
  highlightedWords,
  unknownWords: initialUnknownWords,
  learningWords,
  onMarkUnknown,
  targetLanguage = "hu" // Default to Hungarian
}: InteractiveStoryReaderProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [translation, setTranslation] = useState<WordTranslation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [translationCache, setTranslationCache] = useState<Map<string, WordTranslation>>(new Map());
  const [markedUnknown, setMarkedUnknown] = useState<Set<string>>(new Set(initialUnknownWords.map(w => w.toLowerCase())));

  const unknownWords = Array.from(markedUnknown);

  const handleWordClick = async (word: string) => {
    // Clean the word (remove punctuation)
    const cleanWord = word.replace(/[.,!?;:"""''()]/g, "").toLowerCase();

    setSelectedWord(cleanWord);
    setIsDialogOpen(true);

    // Check cache first
    if (translationCache.has(cleanWord)) {
      console.log('Using cached translation for:', cleanWord);
      setTranslation(translationCache.get(cleanWord)!);
      return;
    }

    setTranslation(null);
    setIsLoading(true);

    try {
      console.log('Translating word:', cleanWord);
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          word: cleanWord,
          targetLanguage,
          sourceLanguage: 'en'
        })
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const result = await response.json();
      setTranslation(result);
      setTranslationCache(prev => new Map(prev).set(cleanWord, result));
    } catch (error) {
      console.error('Translation error:', error);
      // Show basic fallback on error
      const fallbackTranslation = {
        word: cleanWord,
        translation: `[Fordítás: ${cleanWord}]`,
        sourceLanguage: 'en',
        targetLanguage,
        exampleSentence: `The student learned the word "${cleanWord}" today.`,
        exampleTranslation: `A diák megtanulta a(z) "${cleanWord}" szót ma.`,
        phonetic: undefined,
        partOfSpeech: undefined,
        pastTense: undefined,
        futureTense: undefined,
        pluralForm: undefined,
        usageNotes: 'Kérlek, ellenőrizd az internetkapcsolatod a részletes fordításhoz.'
      };
      setTranslation(fallbackTranslation);
      setTranslationCache(prev => new Map(prev).set(cleanWord, fallbackTranslation));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkUnknown = async () => {
    if (selectedWord && onMarkUnknown) {
      // Get the translation from cache
      const wordTranslation = translationCache.get(selectedWord);

      if (wordTranslation) {
        // Save to database with translation data
        try {
          const { client } = await import('@/lib/amplify-client');
          const { fetchAuthSession } = await import('aws-amplify/auth');

          const session = await fetchAuthSession();
          const studentId = session.userSub;

          if (studentId) {
            // Check if word already exists
            const listWordsQuery = /* GraphQL */ `
              query ListWordsByStudent($studentId: ID!) {
                listWordsByStudent(studentId: $studentId, filter: { text: { eq: "${selectedWord}" } }) {
                  items {
                    id
                    text
                  }
                }
              }
            `;

            const existingWords = await client.graphql({
              query: listWordsQuery,
              variables: { studentId }
            }) as { data: { listWordsByStudent: { items: Array<{ id: string; text: string }> } } };

            // Only create if word doesn't exist
            if (!existingWords.data?.listWordsByStudent?.items?.length) {
              const createWordMutation = /* GraphQL */ `
                mutation CreateWord($input: CreateWordInput!) {
                  createWord(input: $input) {
                    id
                    text
                    translation
                    mastery
                  }
                }
              `;

              await client.graphql({
                query: createWordMutation,
                variables: {
                  input: {
                    studentId,
                    text: selectedWord,
                    translation: wordTranslation.translation,
                    exampleSentence: wordTranslation.exampleSentence,
                    exampleTranslation: wordTranslation.exampleTranslation,
                    partOfSpeech: wordTranslation.partOfSpeech,
                    pastTense: wordTranslation.pastTense,
                    futureTense: wordTranslation.futureTense,
                    pluralForm: wordTranslation.pluralForm,
                    usageNotes: wordTranslation.usageNotes,
                    mastery: 'unknown'
                  }
                }
              });

              console.log('Word saved to database with translation:', selectedWord);
            } else {
              console.log('Word already exists in database:', selectedWord);
            }
          }
        } catch (error) {
          console.error('Error saving word to database:', error);
        }
      }

      // Call parent handler and update UI
      await onMarkUnknown(selectedWord);
      // Add to marked unknown set for visual indication
      setMarkedUnknown(prev => new Set(prev).add(selectedWord));
      setIsDialogOpen(false);
    }
  };

  // Split content into words and render with highlighting
  const renderContent = () => {
    // Match words (including accented characters) or non-word sequences (punctuation/spaces)
    const tokens = content.match(/([a-zA-Z0-9À-ÿ]+|[^a-zA-Z0-9À-ÿ]+)/g) || [];

    return tokens.map((token, index) => {
      // If it's just whitespace or punctuation, render as is
      if (!/[a-zA-Z0-9À-ÿ]/.test(token)) {
        return <span key={index}>{token}</span>;
      }

      const cleanWord = token.toLowerCase();

      // Check if this word should be highlighted
      const isHighlighted = highlightedWords.some(hw =>
        hw.toLowerCase() === cleanWord
      );
      const isUnknown = unknownWords.some(uw =>
        uw.toLowerCase() === cleanWord
      );
      const isLearning = learningWords.some(lw =>
        lw.toLowerCase() === cleanWord
      );

      // Determine styling - ALL words are clickable
      let className = "cursor-pointer hover:bg-primary/10 hover:underline transition-all inline-block px-0.5 rounded";
      if (isUnknown) {
        className += " text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/30";
      } else if (isLearning) {
        className += " text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30";
      } else if (isHighlighted) {
        className += " text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-950/30";
      }

      return (
        <span
          key={index}
          className={className}
          onClick={() => handleWordClick(token)}
          title="Kattints a részletekért"
        >
          {token}
        </span>
      );
    });
  };

  return (
    <>
      <div className="prose prose-lg dark:prose-invert max-w-none">
        {/* Marked Unknown Words */}
        {markedUnknown.size > 0 && (
          <div className="mt-2 p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/30">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-3">
              🔖 Ismeretlen szavak ({markedUnknown.size})
            </h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(markedUnknown).map((word) => (
                <Badge
                  key={word}
                  variant="outline"
                  className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700 cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/60"
                  onClick={() => handleWordClick(word)}
                >
                  {word}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Legend & Instructions */}
        <div className="mt-4 mb-4 space-y-3 text-center">
          <p className="text-sm text-muted-foreground italic">
            Kattints bármely szóra a részletes fordításért, nyelvtani alakokért és példamondatokért
          </p>
        </div>
        <div className="leading-relaxed text-justify">
          {renderContent()}
        </div>
      </div>

      {/* Translation Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md w-full h-[92vh] overflow-y-auto sm:max-w-lg sm:h-auto sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="capitalize">{selectedWord}</span>
              {translation && (
                <Badge variant="outline" className="ml-2">
                  {translation.sourceLanguage} → {translation.targetLanguage}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Betöltés...</span>
              </div>
            ) : translation ? (
              <>
                {/* Translation & Part of Speech */}
                <div className="bg-primary/5 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground mb-1">Magyar fordítás</p>
                      <p className="text-2xl font-semibold text-foreground">{translation.translation}</p>
                      {translation.phonetic && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Kiejtés: /{translation.phonetic}/
                        </p>
                      )}
                    </div>
                    {translation.partOfSpeech && (
                      <Badge variant="outline" className="ml-2">
                        {translation.partOfSpeech}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Grammar Forms */}
                {(translation.pastTense || translation.futureTense || translation.pluralForm) && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground mb-2">Nyelvtani alakok</p>
                    {translation.pastTense && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Múlt idő:</span>
                        <span className="font-medium">{translation.pastTense}</span>
                      </div>
                    )}
                    {translation.futureTense && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Jövő idő:</span>
                        <span className="font-medium">{translation.futureTense}</span>
                      </div>
                    )}
                    {translation.pluralForm && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Többes szám:</span>
                        <span className="font-medium">{translation.pluralForm}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Example Sentence with Translation */}
                {translation.exampleSentence && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground">Példamondat</p>
                    <div className="border-l-4 border-primary/40 pl-4 space-y-2">
                      <p className="text-base italic text-foreground">
                        {translation.exampleSentence}
                      </p>
                      {translation.exampleTranslation && (
                        <p className="text-sm text-muted-foreground">
                          📖 {translation.exampleTranslation}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Usage Notes */}
                {translation.usageNotes && (
                  <div className="bg-accent/10 rounded-lg p-3">
                    <p className="text-sm font-semibold text-foreground mb-1">Használati tippek</p>
                    <p className="text-sm text-muted-foreground max-h-64 sm:max-h-40 overflow-y-auto pr-1">
                      {translation.usageNotes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {onMarkUnknown && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Bezárás
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleMarkUnknown}
                    >
                      Ismeretlen szó
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Nem sikerült betölteni a fordítást
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
