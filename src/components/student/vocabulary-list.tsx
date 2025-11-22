'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Check, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Word {
  id: string;
  text: string;
  translation: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  partOfSpeech?: string;
  pastTense?: string;
  futureTense?: string;
  pluralForm?: string;
  usageNotes?: string;
  mastery: 'known' | 'learning' | 'unknown';
  createdAt: string;
}

interface VocabularyListProps {
  studentId: string;
  className?: string;
}

export function VocabularyList({ studentId, className }: VocabularyListProps) {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'unknown' | 'learned'>('unknown');
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);

  const toggleExpand = (wordId: string) => {
    setExpandedWordId(prev => (prev === wordId ? null : wordId));
  };

  useEffect(() => {
    if (studentId) {
      loadWords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const loadWords = async () => {
    try {
      const { client } = await import('@/lib/amplify-client');
      
      const listWordsQuery = /* GraphQL */ `
        query ListWordsByStudent($studentId: ID!, $limit: Int) {
          listWordsByStudent(studentId: $studentId, limit: $limit) {
            items {
              id
              text
              translation
              exampleSentence
              exampleTranslation
              partOfSpeech
              pastTense
              futureTense
              pluralForm
              usageNotes
              mastery
              createdAt
            }
          }
        }
      `;

      const response = await client.graphql({
        query: listWordsQuery,
        variables: { studentId, limit: 500 }
      }) as { data: { listWordsByStudent: { items: Word[] } } };

      if (response.data?.listWordsByStudent?.items) {
        const sortedWords = response.data.listWordsByStudent.items.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setWords(sortedWords);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading words:', error);
      setLoading(false);
    }
  };

  const markAsLearned = async (wordId: string) => {
    try {
      const { client } = await import('@/lib/amplify-client');
      
      const updateWordMutation = /* GraphQL */ `
        mutation UpdateWord($input: UpdateWordInput!) {
          updateWord(input: $input) {
            id
            mastery
          }
        }
      `;

      await client.graphql({
        query: updateWordMutation,
        variables: {
          input: {
            id: wordId,
            mastery: 'known'
          }
        }
      });

      // Update local state
      setWords(prev => prev.map(w => 
        w.id === wordId ? { ...w, mastery: 'known' } : w
      ));
    } catch (error) {
      console.error('Error updating word:', error);
    }
  };

  const deleteWord = async (wordId: string) => {
    try {
      const { client } = await import('@/lib/amplify-client');
      
      const deleteWordMutation = /* GraphQL */ `
        mutation DeleteWord($input: DeleteWordInput!) {
          deleteWord(input: $input) {
            id
          }
        }
      `;

      await client.graphql({
        query: deleteWordMutation,
        variables: {
          input: { id: wordId }
        }
      });

      // Update local state
      setWords(prev => prev.filter(w => w.id !== wordId));
    } catch (error) {
      console.error('Error deleting word:', error);
    }
  };

  const unknownWords = words.filter(w => w.mastery === 'unknown');
  const learnedWords = words.filter(w => w.mastery === 'known' || w.mastery === 'learning');

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'unknown' | 'learned')}>
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-auto min-h-[40px]">
          <TabsTrigger value="unknown" className="py-3 h-auto">
            Ismeretlen szavak ({unknownWords.length})
          </TabsTrigger>
          <TabsTrigger value="learned" className="py-3 h-auto">
            Tanult szavak ({learnedWords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unknown" className="space-y-4 mt-6">
          {unknownWords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nincsenek ismeretlen szavak.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Jelölj meg szavakat a történetek olvasása közben!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {unknownWords.map((word) => {
                const isExpanded = expandedWordId === word.id;
                return (
                  <Card
                    key={word.id}
                    className={cn(
                      "hover:shadow-md transition-all",
                      isExpanded ? "h-auto" : "h-[180px] overflow-hidden"
                    )}
                  >
                    <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-foreground break-words">{word.text}</h3>
                          {word.partOfSpeech && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {word.partOfSpeech}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(word.id);
                          }}
                          className="shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {isExpanded && (
                        <>
                          <div className="border-t pt-3">
                            <p className="text-lg text-muted-foreground">{word.translation}</p>
                          </div>

                          {(word.pastTense || word.futureTense || word.pluralForm) && (
                            <div className="text-sm space-y-1 border-t pt-3">
                              {word.pastTense && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Múlt idő:</span>
                                  <span className="font-medium">{word.pastTense}</span>
                                </div>
                              )}
                              {word.futureTense && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Jövő idő:</span>
                                  <span className="font-medium">{word.futureTense}</span>
                                </div>
                              )}
                              {word.pluralForm && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Többes szám:</span>
                                  <span className="font-medium">{word.pluralForm}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {word.exampleSentence && (
                            <div className="space-y-2 border-t pt-3">
                              <p className="text-sm italic text-foreground break-words">{word.exampleSentence}</p>
                              {word.exampleTranslation && (
                                <p className="text-sm text-muted-foreground break-words">📖 {word.exampleTranslation}</p>
                              )}
                            </div>
                          )}

                          {word.usageNotes && (
                            <div className="bg-accent/10 rounded-lg p-3">
                              <p className="text-sm text-muted-foreground">{word.usageNotes}</p>
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 text-xs sm:text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsLearned(word.id);
                          }}
                        >
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="truncate">Megtanultam</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWord(word.id);
                          }}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="learned" className="space-y-4 mt-6">
          {learnedWords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Check className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Még nincsenek tanult szavak.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Jelöld meg az ismeretlen szavakat megtanultnak!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {learnedWords.map((word) => {
                const isExpanded = expandedWordId === word.id;
                return (
                  <Card
                    key={word.id}
                    className={cn(
                      "hover:shadow-md transition-all border-primary/20",
                      isExpanded ? "h-auto" : "h-[220px] overflow-hidden"
                    )}
                  >
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-foreground">{word.text}</h3>
                          {word.partOfSpeech && (
                            <Badge variant="outline" className="mt-2">
                              {word.partOfSpeech}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-primary" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(word.id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <>
                          <div className="border-t pt-3">
                            <p className="text-lg text-muted-foreground">{word.translation}</p>
                          </div>

                          {word.exampleSentence && (
                            <div className="space-y-1 border-t pt-3">
                              <p className="text-sm italic text-foreground">{word.exampleSentence}</p>
                              {word.exampleTranslation && (
                                <p className="text-sm text-muted-foreground">📖 {word.exampleTranslation}</p>
                              )}
                            </div>
                          )}

                          {(word.pastTense || word.futureTense || word.pluralForm) && (
                            <div className="text-sm space-y-1 border-t pt-3">
                              {word.pastTense && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Múlt idő:</span>
                                  <span className="font-medium">{word.pastTense}</span>
                                </div>
                              )}
                              {word.futureTense && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Jövő idő:</span>
                                  <span className="font-medium">{word.futureTense}</span>
                                </div>
                              )}
                              {word.pluralForm && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Többes szám:</span>
                                  <span className="font-medium">{word.pluralForm}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {word.usageNotes && (
                            <div className="bg-accent/10 rounded-lg p-3 border-t pt-3">
                              <p className="text-sm text-muted-foreground">{word.usageNotes}</p>
                            </div>
                          )}
                        </>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteWord(word.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Törlés
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
