"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, GraduationCap, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RequireAuth } from "@/components/providers/require-auth";
import {
  LEVEL_DESCRIPTIONS,
  PASS_THRESHOLD,
  PLACEMENT_LEVELS,
  PLACEMENT_QUESTIONS,
  QUESTIONS_PER_LEVEL,
  type PlacementLevel,
  type PlacementQuestion,
} from "@/lib/placement-questions";

// Worst case: every level from the starting one up to C2 is tested
const START_LEVEL_INDEX = 1; // A2
const MAX_QUESTIONS = (PLACEMENT_LEVELS.length - START_LEVEL_INDEX) * QUESTIONS_PER_LEVEL;
const FEEDBACK_MS = 900;

type Phase = "intro" | "testing" | "saving" | "result";

function pickQuestions(level: PlacementLevel): PlacementQuestion[] {
  const pool = [...PLACEMENT_QUESTIONS[level]];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, QUESTIONS_PER_LEVEL);
}

function PlacementPageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>("intro");
  const [levelIndex, setLevelIndex] = useState(START_LEVEL_INDEX);
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctAtLevel, setCorrectAtLevel] = useState(0);
  const [answeredTotal, setAnsweredTotal] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [finalLevel, setFinalLevel] = useState<PlacementLevel>("A1");
  const [saveFailed, setSaveFailed] = useState(false);
  const passedLevelsRef = useRef<PlacementLevel[]>([]);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLevel = PLACEMENT_LEVELS[levelIndex];
  const currentQuestion = questions[questionIndex];

  const startTest = () => {
    passedLevelsRef.current = [];
    setLevelIndex(START_LEVEL_INDEX);
    setQuestions(pickQuestions(PLACEMENT_LEVELS[START_LEVEL_INDEX]));
    setQuestionIndex(0);
    setCorrectAtLevel(0);
    setAnsweredTotal(0);
    setChosen(null);
    setPhase("testing");
  };

  const saveResult = async (level: PlacementLevel) => {
    setPhase("saving");
    setFinalLevel(level);
    try {
      const { client } = await import("@/lib/amplify-client");
      const { fetchAuthSession } = await import("aws-amplify/auth");
      const session = await fetchAuthSession();
      const studentId = session.userSub;
      if (!studentId) throw new Error("Not signed in");

      const updateMutation = /* GraphQL */ `
        mutation UpdateStudentProfile($input: UpdateStudentProfileInput!) {
          updateStudentProfile(input: $input) {
            id
            level
            placementCompleted
          }
        }
      `;

      try {
        await client.graphql({
          query: updateMutation,
          variables: {
            input: { id: studentId, level, placementCompleted: true },
          },
        });
      } catch (updateError) {
        // Right after registration the profile record may not exist yet
        console.warn("Profile update failed, creating profile instead:", updateError);
        const { fetchUserAttributes } = await import("aws-amplify/auth");
        const attributes = await fetchUserAttributes().catch(() => ({} as Record<string, string>));
        const createMutation = /* GraphQL */ `
          mutation CreateStudentProfile($input: CreateStudentProfileInput!) {
            createStudentProfile(input: $input) {
              id
            }
          }
        `;
        await client.graphql({
          query: createMutation,
          variables: {
            input: {
              id: studentId,
              name: attributes.name || attributes.email?.split("@")[0] || "New Learner",
              email: attributes.email || `${studentId}@students.wordnest.local`,
              birthday: attributes.birthdate || null,
              level,
              streak: 0,
              vocabularyCount: 0,
              placementCompleted: true,
            },
          },
        });
      }

      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      setSaveFailed(false);
    } catch (error) {
      console.error("Error saving placement result:", error);
      setSaveFailed(true);
    } finally {
      setPhase("result");
    }
  };

  const finishTest = (passed: PlacementLevel[]) => {
    const level = passed.length > 0 ? passed[passed.length - 1] : "A1";
    void saveResult(level);
  };

  const handleAnswer = (option: string) => {
    if (!currentQuestion || chosen) return;
    setChosen(option);
    const isCorrect = option === currentQuestion.correct;
    const newCorrect = correctAtLevel + (isCorrect ? 1 : 0);
    setCorrectAtLevel(newCorrect);
    setAnsweredTotal((prev) => prev + 1);

    advanceTimerRef.current = setTimeout(() => {
      setChosen(null);

      if (questionIndex + 1 < questions.length) {
        setQuestionIndex((prev) => prev + 1);
        return;
      }

      // Level finished — decide up or out
      const passedThisLevel = newCorrect >= PASS_THRESHOLD;
      if (passedThisLevel) {
        passedLevelsRef.current = [...passedLevelsRef.current, currentLevel];
        if (levelIndex + 1 < PLACEMENT_LEVELS.length) {
          const nextIndex = levelIndex + 1;
          setLevelIndex(nextIndex);
          setQuestions(pickQuestions(PLACEMENT_LEVELS[nextIndex]));
          setQuestionIndex(0);
          setCorrectAtLevel(0);
        } else {
          finishTest(passedLevelsRef.current);
        }
      } else {
        finishTest(passedLevelsRef.current);
      }
    }, FEEDBACK_MS);
  };

  const handleSkip = async () => {
    // Remember the choice so the dashboard stops prompting; keep the current level
    try {
      const { client } = await import("@/lib/amplify-client");
      const { fetchAuthSession } = await import("aws-amplify/auth");
      const session = await fetchAuthSession();
      if (session.userSub) {
        const updateMutation = /* GraphQL */ `
          mutation UpdateStudentProfile($input: UpdateStudentProfileInput!) {
            updateStudentProfile(input: $input) {
              id
              placementCompleted
            }
          }
        `;
        await client.graphql({
          query: updateMutation,
          variables: { input: { id: session.userSub, placementCompleted: true } },
        });
        queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      }
    } catch (error) {
      console.warn("Could not persist placement skip:", error);
    }
    router.push("/student");
  };

  const progressValue = useMemo(
    () => Math.min(100, Math.round((answeredTotal / MAX_QUESTIONS) * 100)),
    [answeredTotal]
  );

  // ===== Intro =====
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <Card className="shadow-xl border-border/50">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-display">Szintfelmérő</CardTitle>
              <CardDescription>
                Mérd fel az angol szintedet, hogy a történeteid pont neked valók legyenek!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span>⏱️</span> Körülbelül 2-3 perc, legfeljebb {MAX_QUESTIONS} kérdés.
                </li>
                <li className="flex gap-2">
                  <span>📈</span> A kérdések egyre nehezednek — addig lépsz szintet, amíg jól megy.
                </li>
                <li className="flex gap-2">
                  <span>🎯</span> Az eredmény alapján állítjuk be a történeteid nyelvi szintjét.
                </li>
                <li className="flex gap-2">
                  <span>🔄</span> Később bármikor újra elvégezheted a Beállítások fül alatt.
                </li>
              </ul>
              <div className="flex flex-col gap-2">
                <Button size="lg" onClick={startTest} className="w-full gap-2">
                  <Sparkles className="h-5 w-5" />
                  Szintfelmérő indítása
                </Button>
                <Button variant="ghost" onClick={handleSkip} className="w-full">
                  Kihagyom, kezdjünk A1 szinten
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ===== Saving =====
  if (phase === "saving") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Eredmény mentése...</p>
        </div>
      </div>
    );
  }

  // ===== Result =====
  if (phase === "result") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg"
        >
          <Card className="shadow-xl border-border/50 text-center">
            <CardContent className="p-8 space-y-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.15 }}
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10"
              >
                <span className="text-4xl font-display font-bold text-primary">{finalLevel}</span>
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold font-display">A szinted: {finalLevel}</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {LEVEL_DESCRIPTIONS[finalLevel]}
                </p>
              </div>
              {saveFailed && (
                <p className="text-sm text-destructive">
                  Az eredményt nem sikerült elmenteni — a Beállítások fül alatt kézzel is
                  átállíthatod a szintedet, vagy futtasd újra a szintfelmérőt.
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Button size="lg" onClick={() => router.push("/student")} className="w-full gap-2">
                  Irány az irányítópult
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button variant="ghost" onClick={startTest} className="w-full">
                  Újrapróbálom
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ===== Testing =====
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" size="sm" onClick={handleSkip} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Kihagyom
            </Button>
            <Badge variant="outline">Szint: {currentLevel}</Badge>
          </div>
          <Progress value={progressValue} className="mt-3 h-2" />
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={`${levelIndex}-${questionIndex}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
            >
              <Card>
                <CardHeader className="text-center pb-2">
                  <CardDescription>
                    {currentQuestion.kind === "vocab"
                      ? "Mit jelent magyarul?"
                      : "Melyik szó illik a mondatba?"}
                  </CardDescription>
                  <CardTitle
                    className={
                      currentQuestion.kind === "vocab"
                        ? "text-4xl font-display"
                        : "text-xl font-medium leading-relaxed"
                    }
                  >
                    {currentQuestion.prompt}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-4">
                  {currentQuestion.options.map((option) => {
                    const isChosen = chosen === option;
                    const isCorrectOption = option === currentQuestion.correct;
                    let style = "border-border hover:border-primary/60 hover:bg-muted/50";
                    if (chosen) {
                      if (isCorrectOption) {
                        style = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                      } else if (isChosen) {
                        style = "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
                      } else {
                        style = "border-border opacity-60";
                      }
                    }
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={!!chosen}
                        onClick={() => handleAnswer(option)}
                        className={`w-full rounded-xl border-2 px-4 py-3 text-left text-base font-medium transition-all ${style}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function PlacementPage() {
  return (
    <RequireAuth role="student">
      <PlacementPageInner />
    </RequireAuth>
  );
}
