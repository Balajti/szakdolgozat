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
  unknownWords,
  learningWords,
  onMarkUnknown,
  targetLanguage = "hu" // Default to Hungarian
}: InteractiveStoryReaderProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [translation, setTranslation] = useState<WordTranslation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleWordClick = async (word: string) => {
    // Clean the word (remove punctuation)
    const cleanWord = word.replace(/[.,!?;:"""''()]/g, "").toLowerCase();
    
    setSelectedWord(cleanWord);
    setIsDialogOpen(true);
    setIsLoading(true);
    setTranslation(null);

    try {
      // Call the comprehensive translation API
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: cleanWord,
          sourceLanguage: 'en',
          targetLanguage,
          includeGrammar: true,
          includeExamples: true
        })
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      
      // Enhance with AI-generated grammar information if available
      const { client } = await import('@/lib/amplify-client');
      
      const translateWordQuery = /* GraphQL */ `
        query TranslateWord($word: String!, $targetLanguage: String!) {
          translateWord(word: $word, targetLanguage: $targetLanguage) {
            word
            translation
            exampleSentence
            exampleTranslation
            partOfSpeech
            pastTense
            futureTense
            pluralForm
            usageNotes
          }
        }
      `;

      try {
        const graphqlResponse = await client.graphql({
          query: translateWordQuery,
          variables: { word: cleanWord, targetLanguage }
        }) as { data: { translateWord: WordTranslation } };

        if (graphqlResponse.data?.translateWord) {
          setTranslation(graphqlResponse.data.translateWord);
        } else {
          setTranslation({
            ...data,
            word: cleanWord,
            sourceLanguage: 'en',
            targetLanguage
          });
        }
      } catch (err) {
        console.log('GraphQL translation fallback to basic API', err);
        setTranslation({
          ...data,
          word: cleanWord,
          sourceLanguage: 'en',
          targetLanguage
        });
      }
    } catch (error) {
      console.error('Translation error:', error);
      // Show basic fallback
      setTranslation({
        word: cleanWord,
        translation: cleanWord,
        sourceLanguage: 'en',
        targetLanguage,
        exampleSentence: `This is how you use "${cleanWord}" in a sentence.`,
        exampleTranslation: `Így használod a(z) "${cleanWord}" szót egy mondatban.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkUnknown = async () => {
    if (selectedWord && onMarkUnknown) {
      await onMarkUnknown(selectedWord);
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
        <div className="leading-relaxed text-justify">
          {renderContent()}
        </div>
      </div>

      {/* Translation Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
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
                    <p className="text-sm text-muted-foreground">{translation.usageNotes}</p>
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

      {/* Legend & Instructions */}
      <div className="mt-8 space-y-3">
        <p className="text-sm text-muted-foreground italic">
          💡 Kattints bármely szóra a részletes fordításért, nyelvtani alakokért és példamondatokért
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-red-600 dark:bg-red-400 rounded"></span>
            <span>Ismeretlen szavak</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-amber-600 dark:bg-amber-400 rounded"></span>
            <span>Tanulandó szavak</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-blue-600 dark:bg-blue-400 rounded"></span>
            <span>Kiemelt szavak</span>
          </div>
        </div>
      </div>
    </>
  );
}
