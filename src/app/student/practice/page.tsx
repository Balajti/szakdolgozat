"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ErrorCard } from "@/components/ui/error-card";
import { TextToSpeech } from "@/components/common/text-to-speech";
import { RequireAuth } from "@/components/providers/require-auth";

const SESSION_SIZE = 10;

type Mastery = "known" | "learning" | "unknown";

interface PracticeWord {
  id: string;
  text: string;
  translation: string;
  exampleSentence?: string | null;
  mastery: Mastery;
}

interface Question {
  word: PracticeWord;
  type: "multiple_choice" | "type_in";
  options?: string[]; // for multiple choice
}

interface AnswerRecord {
  word: PracticeWord;
  correct: boolean;
  promotedTo?: Mastery;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeAnswer(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

/** A translation like "ház, otthon" accepts either part as a correct answer. */
function isTranslationMatch(input: string, translation: string): boolean {
  const normalizedInput = normalizeAnswer(input);
  if (!normalizedInput) return false;
  const variants = translation
    .split(/[,;/]/)
    .map(normalizeAnswer)
    .filter(Boolean);
  return variants.includes(normalizedInput);
}

function nextMastery(current: Mastery): Mastery {
  return current === "unknown" ? "learning" : "known";
}

const masteryLabels: Record<Mastery, string> = {
  unknown: "ismeretlen",
  learning: "tanulás alatt",
  known: "ismert",
};

function buildQuestions(words: PracticeWord[]): Question[] {
  const unknown = shuffle(words.filter((w) => w.mastery === "unknown"));
  const learning = shuffle(words.filter((w) => w.mastery === "learning"));
  const sessionWords = [...unknown, ...learning].slice(0, SESSION_SIZE);

  const allTranslations = Array.from(new Set(words.map((w) => w.translation)));

  return shuffle(sessionWords).map((word) => {
    const distractors = shuffle(allTranslations.filter((t) => t !== word.translation)).slice(0, 3);
    // Multiple choice needs 4 meaningful options; otherwise fall back to typing
    if (distractors.length >= 3 && Math.random() < 0.6) {
      return {
        word,
        type: "multiple_choice" as const,
        options: shuffle([word.translation, ...distractors]),
      };
    }
    return { word, type: "type_in" as const };
  });
}

function PracticePageInner() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [revealed, setRevealed] = useState<null | { correct: boolean }>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [finished, setFinished] = useState(false);

  const loadWords = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { client } = await import("@/lib/amplify-client");
      const { fetchAuthSession } = await import("aws-amplify/auth");
      const session = await fetchAuthSession();
      const userId = session.userSub;
      if (!userId) throw new Error("Not signed in");
      setStudentId(userId);

      const listWordsQuery = /* GraphQL */ `
        query ListWordsByStudent($studentId: ID!) {
          listWordsByStudent(studentId: $studentId, limit: 500) {
            items {
              id
              text
              translation
              exampleSentence
              mastery
            }
          }
        }
      `;
      const response = (await client.graphql({
        query: listWordsQuery,
        variables: { studentId: userId },
      })) as { data: { listWordsByStudent: { items: PracticeWord[] } } };

      const words = (response.data?.listWordsByStudent?.items || []).filter(
        (w) => w.text && w.translation && w.mastery !== "known"
      );
      setQuestions(buildQuestions(words));
      setCurrentIndex(0);
      setAnswers([]);
      setFinished(false);
      setRevealed(null);
      setSelectedOption(null);
      setTypedAnswer("");
    } catch (error) {
      console.error("Error loading practice words:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

  const currentQuestion = questions[currentIndex];

  const promoteWord = async (word: PracticeWord): Promise<Mastery | undefined> => {
    if (!studentId) return undefined;
    const promoted = nextMastery(word.mastery);
    try {
      const { client } = await import("@/lib/amplify-client");
      const updateMasteryMutation = /* GraphQL */ `
        mutation UpdateWordMastery($studentId: ID!, $wordId: ID!, $mastery: WordMastery!) {
          updateWordMastery(studentId: $studentId, wordId: $wordId, mastery: $mastery) {
            id
            mastery
          }
        }
      `;
      await client.graphql({
        query: updateMasteryMutation,
        variables: { studentId, wordId: word.id, mastery: promoted },
      });
      return promoted;
    } catch (error) {
      console.error("Error promoting word mastery:", error);
      return undefined;
    }
  };

  const handleCheck = async () => {
    if (!currentQuestion || revealed) return;

    const given =
      currentQuestion.type === "multiple_choice" ? selectedOption ?? "" : typedAnswer;
    const correct =
      currentQuestion.type === "multiple_choice"
        ? given === currentQuestion.word.translation
        : isTranslationMatch(given, currentQuestion.word.translation);

    setRevealed({ correct });

    let promotedTo: Mastery | undefined;
    if (correct) {
      promotedTo = await promoteWord(currentQuestion.word);
    }
    setAnswers((prev) => [...prev, { word: currentQuestion.word, correct, promotedTo }]);
  };

  const handleNext = async () => {
    setRevealed(null);
    setSelectedOption(null);
    setTypedAnswer("");

    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
      // Refresh badges + progress snapshot in the background
      if (studentId) {
        try {
          const { client } = await import("@/lib/amplify-client");
          const checkBadgesMutation = /* GraphQL */ `
            mutation CheckBadges($studentId: ID!) {
              checkBadges(studentId: $studentId) { newBadges allBadges }
            }
          `;
          const trackProgressMutation = /* GraphQL */ `
            mutation TrackVocabularyProgress($studentId: ID!) {
              trackVocabularyProgress(studentId: $studentId) { date knownWords }
            }
          `;
          await Promise.allSettled([
            client.graphql({ query: checkBadgesMutation, variables: { studentId } }),
            client.graphql({ query: trackProgressMutation, variables: { studentId } }),
          ]);
        } catch (error) {
          console.error("Error refreshing badges/progress:", error);
        }
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const correctCount = useMemo(() => answers.filter((a) => a.correct).length, [answers]);
  const promotedWords = useMemo(() => answers.filter((a) => a.promotedTo), [answers]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <ErrorCard
        fullPage
        title="Nem sikerült betölteni a gyakorlást"
        description="Ellenőrizd az internetkapcsolatod, majd próbáld újra."
        onRetry={loadWords}
      />
    );
  }

  // Not enough words to practice
  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-5xl">📚</div>
            <div>
              <h3 className="text-lg font-semibold">Még nincs gyakorolható szavad</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Olvass történeteket és jelöld meg az ismeretlen szavakat — utána itt tudod
                gyakorolni őket.
              </p>
            </div>
            <Button onClick={() => router.push("/student")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Vissza az irányítópultra
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== Results screen =====
  if (finished) {
    const total = answers.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card
              className={
                percentage >= 70
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-amber-500/30 bg-amber-500/5"
              }
            >
              <CardContent className="p-8 text-center space-y-4">
                <div className="text-6xl">{percentage === 100 ? "🏆" : percentage >= 70 ? "⭐" : "💪"}</div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {correctCount} / {total} helyes
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {percentage === 100
                      ? "Hibátlan gyakorlás, fantasztikus!"
                      : percentage >= 70
                        ? "Szép munka, csak így tovább!"
                        : "Gyakorolj holnap is, egyre jobban fog menni!"}
                  </p>
                </div>

                {promotedWords.length > 0 && (
                  <div className="space-y-2 text-left">
                    <p className="text-sm font-semibold text-center">Fejlődő szavaid:</p>
                    <div className="space-y-1.5">
                      {promotedWords.map(({ word, promotedTo }) => (
                        <div
                          key={word.id}
                          className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2 text-sm"
                        >
                          <span className="font-medium">{word.text}</span>
                          <span className="text-muted-foreground">
                            {masteryLabels[word.mastery]} →{" "}
                            <span className="text-green-600 font-medium">
                              {masteryLabels[promotedTo!]}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Button variant="outline" onClick={loadWords} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Új gyakorlás
                  </Button>
                  <Button onClick={() => router.push("/student")} className="gap-2">
                    Vissza az irányítópultra
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  // ===== Question screen =====
  const progressValue = (currentIndex / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/student")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Kilépés
            </Button>
            <div className="text-sm text-muted-foreground">
              {currentIndex + 1} / {questions.length}
            </div>
          </div>
          <Progress value={progressValue} className="mt-3 h-2" />
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
          >
            <Card>
              <CardHeader className="text-center pb-2">
                <CardDescription>Mit jelent magyarul?</CardDescription>
                <CardTitle className="text-4xl font-display flex items-center justify-center gap-3">
                  {currentQuestion.word.text}
                  <TextToSpeech text={currentQuestion.word.text} language="en-US" size="sm" />
                </CardTitle>
                <div className="flex justify-center pt-1">
                  <Badge variant="outline">{masteryLabels[currentQuestion.word.mastery]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {currentQuestion.type === "multiple_choice" && currentQuestion.options ? (
                  <div className="grid gap-2">
                    {currentQuestion.options.map((option) => {
                      const isSelected = selectedOption === option;
                      const isCorrectOption = option === currentQuestion.word.translation;
                      let style = "border-border hover:border-primary/60 hover:bg-muted/50";
                      if (revealed) {
                        if (isCorrectOption) {
                          style = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                        } else if (isSelected) {
                          style = "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
                        } else {
                          style = "border-border opacity-60";
                        }
                      } else if (isSelected) {
                        style = "border-primary ring-2 ring-primary/30 bg-primary/5";
                      }
                      return (
                        <button
                          key={option}
                          type="button"
                          disabled={!!revealed}
                          onClick={() => setSelectedOption(option)}
                          className={`w-full rounded-xl border-2 px-4 py-3 text-left text-base font-medium transition-all ${style}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && typedAnswer.trim() && !revealed) handleCheck();
                      }}
                      disabled={!!revealed}
                      placeholder="Írd be a magyar jelentést..."
                      className="h-12 text-base text-center"
                      autoFocus
                    />
                  </div>
                )}

                {/* Feedback */}
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border p-4 text-center ${
                      revealed.correct
                        ? "border-green-500/40 bg-green-500/10"
                        : "border-red-500/40 bg-red-500/10"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 font-semibold">
                      {revealed.correct ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          Helyes!
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-600" />
                          Nem talált.
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentQuestion.word.text} ={" "}
                      <span className="font-medium text-foreground">
                        {currentQuestion.word.translation}
                      </span>
                    </p>
                    {currentQuestion.word.exampleSentence && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {currentQuestion.word.exampleSentence}
                      </p>
                    )}
                    {revealed.correct && currentQuestion.word.mastery !== "known" && (
                      <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                        A szó mostantól „{masteryLabels[nextMastery(currentQuestion.word.mastery)]}” státuszú.
                      </p>
                    )}
                  </motion.div>
                )}

                <div className="flex justify-center pt-2">
                  {revealed ? (
                    <Button size="lg" onClick={handleNext} className="gap-2 px-8">
                      {currentIndex + 1 >= questions.length ? "Eredmények" : "Következő"}
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      onClick={handleCheck}
                      disabled={
                        currentQuestion.type === "multiple_choice"
                          ? !selectedOption
                          : !typedAnswer.trim()
                      }
                      className="gap-2 px-8"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      Ellenőrzés
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function PracticePage() {
  return (
    <RequireAuth role="student">
      <PracticePageInner />
    </RequireAuth>
  );
}
