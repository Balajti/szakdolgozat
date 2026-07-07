"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Clock,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  GripVertical,
  RotateCcw,
  Send,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorCard } from "@/components/ui/error-card";
import { useToast } from "@/hooks/use-toast";

// ===================
// Types
// ===================
interface Assignment {
  id: string;
  title: string;
  teacherId: string;
  assignmentType: string;
  dueDate: string;
  level: string;
  storyContent?: string;
  requiredWords?: string[];
  matchingWords?: string[];
  blankPositions?: string; // JSON string from DB
  highlightedWords?: string; // JSON string from DB
}

interface BlankPosition {
  word: string;
  offset: number;
  length: number;
}

// ===================
// Step definitions
// ===================
type Step = "email" | "task" | "completed";

const STEP_LABELS: Record<Step, string> = {
  email: "Azonosítás",
  task: "Feladat",
  completed: "Befejezés",
};

// ===================
// Timer hook
// ===================
function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatted = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  return { seconds, formatted, start, stop };
}

// ===================
// Progress Steps Bar
// ===================
function ProgressSteps({ currentStep }: { currentStep: Step }) {
  const steps: Step[] = ["email", "task", "completed"];
  const currentIdx = steps.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-2 w-full max-w-md mx-auto">
      {steps.map((step, idx) => (
        <div key={step} className="flex items-center gap-2 flex-1">
          <div className="flex flex-col items-center gap-1 flex-1">
            <motion.div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                idx < currentIdx
                  ? "bg-green-500 text-white"
                  : idx === currentIdx
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
              animate={idx === currentIdx ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {idx < currentIdx ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
            </motion.div>
            <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
              {STEP_LABELS[step]}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 rounded transition-colors mb-5 ${
                idx < currentIdx ? "bg-green-500" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ===================
// Fill-in-the-blanks component (drag & drop)
// ===================
interface BankChip {
  id: number;
  word: string;
}

// Drops malformed or overlapping blank entries so the rendered blanks always
// match the answer bookkeeping.
function sanitizeBlanks(content: string, blanks: BlankPosition[]): BlankPosition[] {
  const valid: BlankPosition[] = [];
  let scanEnd = 0;
  for (const blank of [...blanks].sort((a, b) => a.offset - b.offset)) {
    if (!blank.word || blank.offset < scanEnd || blank.offset + blank.length > content.length) continue;
    valid.push(blank);
    scanEnd = blank.offset + blank.length;
  }
  return valid;
}

function FillBlanksTask({
  content,
  blanks,
  onComplete,
}: {
  content: string;
  blanks: BlankPosition[];
  onComplete: (answers: { blankIndex: number; answer: string; correctAnswer: string }[]) => void;
}) {
  const sortedBlanks = sanitizeBlanks(content, blanks);

  // One draggable chip per blank, shuffled once
  const [bank] = useState<BankChip[]>(() =>
    sanitizeBlanks(content, blanks)
      .map((blank, id) => ({ id, word: blank.word }))
      .sort(() => Math.random() - 0.5)
  );

  // blank index -> chip id
  const [placements, setPlacements] = useState<Record<number, number>>({});
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Build text segments around the blanks
  const segments: { type: "text" | "blank"; content: string; blankIndex?: number }[] = [];
  let lastEnd = 0;

  sortedBlanks.forEach((blank, idx) => {
    if (blank.offset > lastEnd) {
      segments.push({ type: "text", content: content.substring(lastEnd, blank.offset) });
    }
    segments.push({ type: "blank", content: blank.word, blankIndex: idx });
    lastEnd = blank.offset + blank.length;
  });
  if (lastEnd < content.length) {
    segments.push({ type: "text", content: content.substring(lastEnd) });
  }

  const chipUsed = (chipId: number) => Object.values(placements).includes(chipId);
  const chipById = (chipId: number) => bank.find((c) => c.id === chipId);

  const placeChip = (blankIdx: number, chipId: number) => {
    if (showResults) return;
    setPlacements((prev) => {
      const next = { ...prev };
      // If this chip is already in another blank, move it
      for (const key of Object.keys(next)) {
        if (next[Number(key)] === chipId) delete next[Number(key)];
      }
      next[blankIdx] = chipId;
      return next;
    });
    setSelectedChip(null);
  };

  const clearBlank = (blankIdx: number) => {
    if (showResults) return;
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[blankIdx];
      return next;
    });
  };

  const handleBlankClick = (blankIdx: number) => {
    if (showResults) return;
    if (selectedChip !== null) {
      placeChip(blankIdx, selectedChip);
    } else if (placements[blankIdx] !== undefined) {
      clearBlank(blankIdx);
    }
  };

  const handleDrop = (blankIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    const chipId = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!Number.isNaN(chipId)) placeChip(blankIdx, chipId);
  };

  const answerForBlank = (blankIdx: number): string => {
    const chipId = placements[blankIdx];
    if (chipId === undefined) return "";
    return chipById(chipId)?.word ?? "";
  };

  const isCorrect = (blankIdx: number): boolean | null => {
    if (!showResults) return null;
    const answer = answerForBlank(blankIdx).toLowerCase().trim();
    const correct = sortedBlanks[blankIdx].word.toLowerCase().trim();
    return answer === correct;
  };

  const allFilled = sortedBlanks.every((_, idx) => placements[idx] !== undefined);

  const handleCheck = () => {
    setShowResults(true);
    const answerList = sortedBlanks.map((blank, idx) => ({
      blankIndex: idx,
      answer: answerForBlank(idx),
      correctAnswer: blank.word,
    }));
    onComplete(answerList);
  };

  const correctCount = showResults
    ? sortedBlanks.filter((_, idx) => isCorrect(idx)).length
    : 0;
  const incorrectCount = showResults ? sortedBlanks.length - correctCount : 0;

  return (
    <div className="space-y-6">
      {/* Word bank */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Szóbank
          </CardTitle>
          <CardDescription>
            Húzd a szavakat a szövegben lévő üres helyekre! (Vagy koppints egy szóra, majd az üres helyre.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {bank.map((chip) => {
              const used = chipUsed(chip.id);
              return (
                <button
                  key={chip.id}
                  type="button"
                  draggable={!used && !showResults}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", String(chip.id));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => {
                    if (used || showResults) return;
                    setSelectedChip((prev) => (prev === chip.id ? null : chip.id));
                  }}
                  disabled={used || showResults}
                  className={`
                    inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-sm font-medium
                    shadow-sm transition-all select-none
                    ${used
                      ? "opacity-40 border-border bg-muted cursor-default"
                      : selectedChip === chip.id
                        ? "border-primary ring-2 ring-primary/30 bg-primary/10 cursor-grab"
                        : "border-border bg-white dark:bg-card cursor-grab hover:border-primary/50 active:cursor-grabbing"
                    }
                  `}
                >
                  <GripVertical className="h-3.5 w-3.5 opacity-50" />
                  {chip.word}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Story with blanks */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="text-base leading-[2.4] whitespace-pre-wrap">
            {segments.map((seg, idx) => {
              if (seg.type === "text") {
                return <span key={idx}>{seg.content}</span>;
              }
              const blankIdx = seg.blankIndex!;
              const placedWord = answerForBlank(blankIdx);
              const correct = isCorrect(blankIdx);
              return (
                <span key={idx} className="inline-block mx-1 align-baseline">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => handleBlankClick(blankIdx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleBlankClick(blankIdx);
                    }}
                    onDragOver={(e) => {
                      if (!showResults) e.preventDefault();
                    }}
                    onDrop={(e) => handleDrop(blankIdx, e)}
                    className={`
                      inline-flex min-w-24 sm:min-w-28 items-center justify-center rounded-lg border-2 border-dashed
                      px-2 py-0.5 text-sm font-medium text-center transition-colors
                      ${showResults
                        ? correct
                          ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                          : "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                        : placedWord
                          ? "border-primary bg-primary/10 text-primary cursor-pointer"
                          : selectedChip !== null
                            ? "border-primary/70 bg-primary/5 cursor-pointer animate-pulse"
                            : "border-primary/40 bg-muted/40 cursor-pointer"
                      }
                    `}
                  >
                    {placedWord || "..."}
                  </span>
                  {showResults && !correct && (
                    <span className="text-xs text-green-600 dark:text-green-400 ml-1">
                      ({seg.content})
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {showResults ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={correctCount === sortedBlanks.length ?
            "border-green-500/30 bg-green-500/5" :
            "border-amber-500/30 bg-amber-500/5"
          }>
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">
                {correctCount === sortedBlanks.length ? "🎉" : "💪"}
              </div>
              <p className="text-lg font-bold">
                {correctCount} helyes, {incorrectCount} hibás
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {correctCount === sortedBlanks.length
                  ? "Tökéletes munka!"
                  : "Jó munka! A pirossal jelölt helyeknél zárójelben látod a helyes szót."}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setPlacements({});
              setSelectedChip(null);
            }}
            disabled={Object.keys(placements).length === 0}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Újrakezdés
          </Button>
          <Button onClick={handleCheck} disabled={!allFilled} size="lg" className="gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Ellenőrzés
          </Button>
        </div>
      )}
    </div>
  );
}

// ===================
// Basic reading component
// ===================
function BasicReadingTask({
  content,
  onComplete,
}: {
  content: string;
  onComplete: () => void;
}) {
  const [readScrolled, setReadScrolled] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollPercent = (el.scrollTop + el.clientHeight) / el.scrollHeight;
      if (scrollPercent > 0.85) {
        setReadScrolled(true);
      }
    };

    // If content fits without scrolling, auto-enable
    if (el.scrollHeight <= el.clientHeight + 10) {
      setReadScrolled(true);
    }

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Olvasd el a történetet
          </CardTitle>
          <CardDescription>
            Görgess végig a történeten és kattints a befejezés gombra, ha elkészültél.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={contentRef}
            className="max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin"
          >
            <div className="prose prose-slate max-w-none">
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {content}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          onClick={onComplete}
          disabled={!readScrolled}
          size="lg"
          className="gap-2"
        >
          <CheckCircle2 className="h-5 w-5" />
          Elolvastam
        </Button>
      </div>
    </div>
  );
}

// ===================
// Completed Screen
// ===================
interface SubmitResult {
  percentage: number;
  feedback: string;
  passed: boolean;
}

function CompletedScreen({
  score,
  maxScore,
  assignmentType,
  onSubmit,
  submitting,
  submitted,
  studentEmail,
  serverResult,
}: {
  score: number;
  maxScore: number;
  assignmentType: string;
  onSubmit: () => void;
  submitting: boolean;
  submitted: boolean;
  studentEmail: string;
  serverResult: SubmitResult | null;
}) {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 100;
  const isPerfect = percentage === 100;
  const isPassed = percentage >= 70;

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="mb-6"
        >
          <div className="h-24 w-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold mb-2">Sikeresen beküldve! 🎉</h2>

          {serverResult && assignmentType !== "basic" ? (
            <div className="mx-auto mb-4 max-w-sm rounded-2xl border border-border/60 bg-card p-5 space-y-2">
              <p className="text-4xl font-bold">{serverResult.percentage}%</p>
              <p className="text-sm font-medium">{serverResult.feedback}</p>
              <Badge
                className={
                  serverResult.passed
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }
              >
                {serverResult.passed ? "Sikeres teljesítés" : "Nem érte el a 70%-ot"}
              </Badge>
            </div>
          ) : serverResult?.feedback ? (
            <p className="text-sm font-medium mb-2">{serverResult.feedback}</p>
          ) : null}

          <p className="text-muted-foreground mb-2">
            A tanárod értesítést kapott a teljesítésedről.
          </p>
          <p className="text-sm text-muted-foreground">
            Beküldve: <span className="font-medium">{studentEmail}</span>
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Score card */}
      <Card className={`text-center ${isPerfect ? 'border-yellow-500/30 bg-gradient-to-b from-yellow-500/5 to-transparent' : isPassed ? 'border-green-500/30 bg-gradient-to-b from-green-500/5 to-transparent' : 'border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent'}`}>
        <CardContent className="p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="mb-4"
          >
            {isPerfect ? (
              <div className="text-6xl">🏆</div>
            ) : isPassed ? (
              <div className="text-6xl">⭐</div>
            ) : (
              <div className="text-6xl">💪</div>
            )}
          </motion.div>

          {assignmentType !== "basic" && (
            <>
              <div className="text-5xl font-bold mb-1">{percentage}%</div>
              <p className="text-muted-foreground">
                {isPerfect
                  ? "Tökéletes eredmény!"
                  : isPassed
                  ? "Szép munka, sikeres teljesítés!"
                  : "Gyakorolj tovább, legközelebb jobb lesz!"}
              </p>
            </>
          )}

          {assignmentType === "basic" && (
            <>
              <h3 className="text-2xl font-bold mb-1">Kész vagy!</h3>
              <p className="text-muted-foreground">Sikeresen elolvastad a történetet.</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-center">
        <Button
          onClick={onSubmit}
          size="lg"
          className="gap-2 px-8"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Beküldés...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Feladat beküldése
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// ===================
// Main page
// ===================
function AssignmentPageInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [studentEmail, setStudentEmail] = useState("");
  const [currentStep, setCurrentStep] = useState<Step>("email");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverResult, setServerResult] = useState<SubmitResult | null>(null);
  const [taskScore, setTaskScore] = useState(0);
  const [taskMaxScore, setTaskMaxScore] = useState(100);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [taskAnswers, setTaskAnswers] = useState<Record<string, unknown> | null>(null);
  const timer = useTimer();

  useEffect(() => {
    loadAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadAssignment = async () => {
    try {
      const { client } = await import("@/lib/amplify-client");

      const getAssignmentQuery = /* GraphQL */ `
        query GetAssignment($id: ID!) {
          getAssignment(id: $id) {
            id
            title
            teacherId
            assignmentType
            dueDate
            level
            storyContent
            requiredWords
            matchingWords
            blankPositions
          }
        }
      `;

      const response = (await client.graphql({
        query: getAssignmentQuery,
        variables: { id },
        authMode: "apiKey",
      })) as { data?: { getAssignment?: Assignment } };

      const assignmentData = response.data?.getAssignment;
      if (!assignmentData) {
        toast({
          title: "Hiba",
          description: "Nem található feladat.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setAssignment(assignmentData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading assignment:", error);
      setLoading(false);
      toast({
        title: "Hiba",
        description: "Nem sikerült betölteni a feladatot.",
        variant: "destructive",
      });
    }
  };

  const handleEmailConfirm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail)) {
      toast({
        title: "Hibás email",
        description: "Add meg egy érvényes email címet.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep("task");
    timer.start();
  };

  const handleFillBlanksComplete = (answers: { blankIndex: number; answer: string; correctAnswer: string }[]) => {
    const correct = answers.filter(
      (a) => a.answer.toLowerCase().trim() === a.correctAnswer.toLowerCase().trim()
    ).length;
    const score = answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0;
    setTaskScore(score);
    setTaskMaxScore(100);
    setTaskCompleted(true);
    setTaskAnswers({ blanks: answers });
    timer.stop();
  };

  const handleBasicComplete = () => {
    setTaskScore(100);
    setTaskMaxScore(100);
    setTaskCompleted(true);
    setTaskAnswers({ completed: true });
    timer.stop();
  };

  // Auto-advance to completed step when task is done
  useEffect(() => {
    if (taskCompleted && currentStep === "task") {
      const timeout = setTimeout(() => {
        setCurrentStep("completed");
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [taskCompleted, currentStep]);

  const handleSubmit = async () => {
    if (!assignment) return;
    setSubmitting(true);

    try {
      const { client } = await import("@/lib/amplify-client");

      // The submitAssignment Lambda grades the answers and records both the
      // submission and the teacher-facing summary used by the statistics.
      const submitMutation = /* GraphQL */ `
        mutation SubmitAssignment(
          $assignmentId: ID!
          $studentEmail: AWSEmail
          $answers: AWSJSON!
          $timeSpentSeconds: Int
        ) {
          submitAssignment(
            assignmentId: $assignmentId
            studentEmail: $studentEmail
            answers: $answers
            timeSpentSeconds: $timeSpentSeconds
          ) {
            id
            assignmentId
            studentId
            score
            maxScore
            percentage
            feedback
            submittedAt
            passed
          }
        }
      `;

      const response = (await client.graphql({
        query: submitMutation,
        variables: {
          assignmentId: id,
          studentEmail: studentEmail.trim().toLowerCase(),
          answers: JSON.stringify(taskAnswers ?? { completed: true }),
          timeSpentSeconds: timer.seconds,
        },
        authMode: "apiKey",
      })) as {
        data?: {
          submitAssignment?: { percentage: number; feedback: string; passed: boolean };
        };
      };

      const result = response.data?.submitAssignment;
      if (result) {
        setServerResult({
          percentage: result.percentage,
          feedback: result.feedback,
          passed: result.passed,
        });
      }

      setSubmitted(true);
      toast({
        title: "Beküldve! 🎉",
        description: "A tanárod értesítést kapott a beküldésről.",
      });
    } catch (error) {
      console.error("Error submitting assignment:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült beküldeni a feladatot. Próbáld újra.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">Feladat betöltése...</p>
        </motion.div>
      </div>
    );
  }

  // Not found / failed to load
  if (!assignment) {
    return (
      <ErrorCard
        fullPage
        title="Nem található feladat"
        description="Ez a feladat már nem elérhető, hibás a link, vagy hálózati hiba történt."
        onRetry={() => {
          setLoading(true);
          loadAssignment();
        }}
      />
    );
  }

  const dueDate = new Date(assignment.dueDate).toLocaleDateString("hu-HU");
  const isOverdue = new Date(assignment.dueDate) < new Date();

  const getAssignmentIcon = () => {
    switch (assignment.assignmentType) {
      case "fill_blanks": return "🧩";
      case "word_matching": return "🔗";
      case "custom_words": return "⭐";
      default: return "📖";
    }
  };

  const getAssignmentTypeLabel = () => {
    switch (assignment.assignmentType) {
      case "fill_blanks": return "Hiányzó szavak";
      case "word_matching": return "Szópárosítás";
      case "custom_words": return "Szógyakorlás";
      default: return "Olvasási feladat";
    }
  };

  // Parse blank positions JSON and drop malformed entries up front
  const parsedBlanks: BlankPosition[] = (() => {
    if (!assignment.blankPositions || !assignment.storyContent) return [];
    try {
      const parsed = typeof assignment.blankPositions === "string"
        ? JSON.parse(assignment.blankPositions)
        : assignment.blankPositions;
      return Array.isArray(parsed) ? sanitizeBlanks(assignment.storyContent, parsed) : [];
    } catch { return []; }
  })();

  // ============ EMAIL STEP ============
  if (currentStep === "email") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          {/* Hero */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-4"
            >
              <span className="text-4xl">🪺</span>
            </motion.div>
            <h1 className="text-3xl font-bold font-display bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              WordNest
            </h1>
            <p className="text-sm text-muted-foreground mt-1">English Learning Platform</p>
          </div>

          {/* Assignment Card */}
          <Card className="shadow-xl border-border/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="flex h-14 w-14 mx-auto mb-3 items-center justify-center rounded-xl bg-primary/10">
                <span className="text-3xl">{getAssignmentIcon()}</span>
              </div>
              <CardTitle className="text-xl">{assignment.title}</CardTitle>
              <CardDescription className="text-sm">
                Szint:
                <Badge variant="outline" className="ml-2">{assignment.level}</Badge>
                <Badge variant="outline" className="ml-2">{getAssignmentTypeLabel()}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Deadline */}
              <div className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm ${
                isOverdue
                  ? "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
                  : "bg-muted/50"
              }`}>
                <Clock className="h-4 w-4" />
                <span>Határidő: {dueDate}</span>
                {isOverdue && <Badge variant="destructive" className="ml-2 text-xs">Lejárt</Badge>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="student-email">Email cím *</Label>
                <Input
                  id="student-email"
                  type="email"
                  placeholder="pelda@email.com"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleEmailConfirm();
                  }}
                  className="h-12 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  A tanárod így tudja majd nyomon követni, hogy megcsináltad a feladatot.
                </p>
              </div>

              <Button
                onClick={handleEmailConfirm}
                className="w-full h-12 text-base gap-2"
                disabled={!studentEmail.trim()}
              >
                Feladat megkezdése
                <ArrowRight className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>

          {/* Progress */}
          <div className="mt-6">
            <ProgressSteps currentStep={currentStep} />
          </div>
        </motion.div>
      </div>
    );
  }

  // ============ TASK & COMPLETED STEPS ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <span className="text-xl">{getAssignmentIcon()}</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold font-display truncate">
                  {assignment.title}
                </h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{assignment.level}</Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{getAssignmentTypeLabel()}</Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Timer */}
              <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
                <Timer className="h-3.5 w-3.5" />
                {timer.formatted}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="border-b border-border/20 bg-card/30 backdrop-blur-sm py-3">
        <div className="container mx-auto px-4">
          <ProgressSteps currentStep={currentStep} />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-3xl">
        <AnimatePresence mode="wait">
          {currentStep === "task" && (
            <motion.div
              key="task"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              {assignment.assignmentType === "fill_blanks" && assignment.storyContent && parsedBlanks.length > 0 ? (
                <FillBlanksTask
                  content={assignment.storyContent}
                  blanks={parsedBlanks}
                  onComplete={handleFillBlanksComplete}
                />
              ) : assignment.storyContent ? (
                <BasicReadingTask
                  content={assignment.storyContent}
                  onComplete={handleBasicComplete}
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Nincs tartalom ehhez a feladathoz.</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {currentStep === "completed" && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              <CompletedScreen
                score={taskScore}
                maxScore={taskMaxScore}
                assignmentType={assignment.assignmentType}
                onSubmit={handleSubmit}
                submitting={submitting}
                submitted={submitted}
                studentEmail={studentEmail}
                serverResult={serverResult}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-16 py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>© 2025 WordNest · English Learning Platform</p>
        </div>
      </footer>
    </div>
  );
}

export default function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  return <AssignmentPageInner params={params} />;
}
