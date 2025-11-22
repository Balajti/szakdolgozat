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
  phonetic?: string;
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
      // Call the translateWord query
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: cleanWord,
          sourceLanguage: 'en',
          targetLanguage
        })
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setTranslation(data);
    } catch (error) {
      console.error('Translation error:', error);
      // Show basic fallback
      setTranslation({
        word: cleanWord,
        translation: cleanWord,
        sourceLanguage: 'en',
        targetLanguage,
        exampleSentence: `Example: This is how you use "${cleanWord}" in a sentence.`
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

      // Determine styling
      let className = "cursor-pointer hover:underline transition-all inline-block";
      if (isUnknown) {
        className += " text-red-600 dark:text-red-400 font-semibold";
      } else if (isLearning) {
        className += " text-amber-600 dark:text-amber-400 font-medium";
      } else if (isHighlighted) {
        className += " text-blue-600 dark:text-blue-400 font-medium";
      }

      return (
        <span
          key={index}
          className={className}
          onClick={() => handleWordClick(token)}
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
              </div>
            ) : translation ? (
              <>
                {/* Translation */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Translation</p>
                  <p className="text-2xl font-semibold">{translation.translation}</p>
                  {translation.phonetic && (
                    <p className="text-sm text-muted-foreground mt-1">
                      /{translation.phonetic}/
                    </p>
                  )}
                </div>

                {/* Example Sentence */}
                {translation.exampleSentence && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Example</p>
                    <p className="text-base italic border-l-2 border-primary pl-3">
                      {translation.exampleSentence}
                    </p>
                  </div>
                )}

                {/* Actions */}
                {onMarkUnknown && (
                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Close
                    </Button>
                    <Button 
                      variant="default" 
                      className="flex-1"
                      onClick={handleMarkUnknown}
                    >
                      Mark as Unknown
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Failed to load translation
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-red-600 dark:bg-red-400 rounded"></span>
          <span>Unknown words</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-amber-600 dark:bg-amber-400 rounded"></span>
          <span>Learning words</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 bg-blue-600 dark:bg-blue-400 rounded"></span>
          <span>Highlighted words</span>
        </div>
      </div>
    </>
  );
}
