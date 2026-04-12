"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Clock,
  Loader2,
  CheckCircle2,
  Mail,
  ArrowRight,
  Sparkles,
  Trophy,
  Star,
  GripVertical,
  RotateCcw,
  Send,
  Timer,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface MatchPair {
  word: string;
  selectedMatch: string | null;
  isCorrect: boolean | null;
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
// Fill-in-the-blanks component
// ===================
function FillBlanksTask({
  content,
  blanks,
  onComplete,
}: {
  content: string;
  blanks: BlankPosition[];
  onComplete: (answers: { blankIndex: number; answer: string; correctAnswer: string }[]) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const sortedBlanks = [...blanks].sort((a, b) => a.offset - b.offset);

  // Build text segments
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

  const allFilled = sortedBlanks.every((_, idx) => answers[idx]?.trim());

  const handleCheck = () => {
    setShowResults(true);
    const answerList = sortedBlanks.map((blank, idx) => ({
      blankIndex: idx,
      answer: answers[idx]?.trim() || "",
      correctAnswer: blank.word,
    }));
    onComplete(answerList);
  };

  const isCorrect = (idx: number) => {
    if (!showResults) return null;
    const answer = answers[idx]?.toLowerCase().trim() || "";
    const correct = sortedBlanks[idx].word.toLowerCase().trim();
    return answer === correct;
  };

  const correctCount = showResults
    ? sortedBlanks.filter((_, idx) => isCorrect(idx)).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Word bank */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Szóbank
          </CardTitle>
          <CardDescription>Használd ezeket a szavakat a hiányzó helyek kitöltéséhez</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[...sortedBlanks]
              .sort(() => Math.random() - 0.5)
              .map((blank, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-sm px-3 py-1.5 font-medium bg-white dark:bg-card shadow-sm"
                >
                  {blank.word}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Story with blanks */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="text-base leading-[2.2] whitespace-pre-wrap">
            {segments.map((seg, idx) => {
              if (seg.type === "text") {
                return <span key={idx}>{seg.content}</span>;
              }
              const blankIdx = seg.blankIndex!;
              const correct = isCorrect(blankIdx);
              return (
                <span key={idx} className="inline-block mx-1 align-bottom">
                  <input
                    type="text"
                    value={answers[blankIdx] || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [blankIdx]: e.target.value }))
                    }
                    disabled={showResults}
                    placeholder="..."
                    className={`
                      w-24 sm:w-28 border-b-2 bg-transparent text-center text-sm font-medium
                      focus:outline-none transition-colors px-1 py-0.5
                      ${
                        showResults
                          ? correct
                            ? "border-green-500 text-green-700 dark:text-green-400"
                            : "border-red-500 text-red-700 dark:text-red-400"
                          : "border-primary/40 focus:border-primary"
                      }
                    `}
                  />
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
                {correctCount} / {sortedBlanks.length} helyes
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {correctCount === sortedBlanks.length
                  ? "Tökéletes munka!"
                  : "Jó munka! Nézd át a piros szavakat."}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="flex justify-center">
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
// Word matching component
// ===================
function WordMatchingTask({
  words,
  storyContent,
  onComplete,
}: {
  words: string[];
  storyContent?: string;
  onComplete: (answers: { word: string; selectedDefinition: string; correctDefinition: string }[]) => void;
}) {
  // For a real app you'd fetch translations. Here we use the words themselves
  // and shuffle them for matching. The student needs to find the correct order.
  const [shuffledWords] = useState(() => [...words].sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState<{ left: number | null; right: number | null }>({
    left: null,
    right: null,
  });
  const [matches, setMatches] = useState<Map<number, number>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [correctMatches, setCorrectMatches] = useState<Set<number>>(new Set());

  // Create pairs: original order = correct, shuffled = what student sees on right
  const leftWords = words;
  const rightWords = shuffledWords;

  const handleLeftClick = (idx: number) => {
    if (showResults || matches.has(idx)) return;
    setSelected((prev) => ({ ...prev, left: idx }));

    // If right is already selected, make pair
    if (selected.right !== null) {
      const rightIdx = selected.right;
      if (!Array.from(matches.values()).includes(rightIdx)) {
        setMatches((prev) => new Map(prev).set(idx, rightIdx));
        setSelected({ left: null, right: null });
      }
    }
  };

  const handleRightClick = (idx: number) => {
    if (showResults || Array.from(matches.values()).includes(idx)) return;
    setSelected((prev) => ({ ...prev, right: idx }));

    // If left is already selected, make pair
    if (selected.left !== null) {
      const leftIdx = selected.left;
      if (!matches.has(leftIdx)) {
        setMatches((prev) => new Map(prev).set(leftIdx, idx));
        setSelected({ left: null, right: null });
      }
    }
  };

  const handleUnmatch = (leftIdx: number) => {
    if (showResults) return;
    setMatches((prev) => {
      const next = new Map(prev);
      next.delete(leftIdx);
      return next;
    });
  };

  const allMatched = matches.size === leftWords.length;

  const handleCheck = () => {
    setShowResults(true);
    const correct = new Set<number>();
    const answerList: { word: string; selectedDefinition: string; correctDefinition: string }[] = [];

    matches.forEach((rightIdx, leftIdx) => {
      const leftWord = leftWords[leftIdx];
      const rightWord = rightWords[rightIdx];
      const isMatch = leftWord === rightWord;
      if (isMatch) correct.add(leftIdx);
      answerList.push({
        word: leftWord,
        selectedDefinition: rightWord,
        correctDefinition: leftWord,
      });
    });

    setCorrectMatches(correct);
    onComplete(answerList);
  };

  const correctCount = correctMatches.size;

  const getLeftColor = (idx: number) => {
    if (showResults && matches.has(idx)) {
      return correctMatches.has(idx)
        ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
        : "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
    }
    if (matches.has(idx)) return "border-primary bg-primary/10 text-primary";
    if (selected.left === idx) return "border-primary ring-2 ring-primary/30 bg-primary/5";
    return "border-border hover:border-primary/50 hover:bg-muted/50";
  };

  const getRightColor = (idx: number) => {
    const matchedLeft = Array.from(matches.entries()).find(([, v]) => v === idx);
    if (showResults && matchedLeft) {
      return correctMatches.has(matchedLeft[0])
        ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
        : "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
    }
    if (Array.from(matches.values()).includes(idx)) return "border-primary bg-primary/10 text-primary";
    if (selected.right === idx) return "border-primary ring-2 ring-primary/30 bg-primary/5";
    return "border-border hover:border-primary/50 hover:bg-muted/50";
  };

  return (
    <div className="space-y-6">
      {/* Story content if available */}
      {storyContent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Történet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none max-h-48 overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{storyContent}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm text-center text-muted-foreground">
            Párosítsd össze a szavakat! Kattints egy szóra a bal oldalon, majd a megfelelő párjára a jobb oldalon.
          </p>
        </CardContent>
      </Card>

      {/* Matching grid */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {/* Left column */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground text-center mb-3">Szavak</p>
          {leftWords.map((word, idx) => {
            const matchedRightIdx = matches.get(idx);
            return (
              <motion.button
                key={`left-${idx}`}
                whileTap={{ scale: 0.97 }}
                onClick={() => matches.has(idx) ? handleUnmatch(idx) : handleLeftClick(idx)}
                className={`
                  w-full px-3 py-2.5 rounded-xl border-2 text-sm font-medium
                  transition-all cursor-pointer flex items-center justify-between gap-2
                  ${getLeftColor(idx)}
                `}
              >
                <span className="truncate">{word}</span>
                {matches.has(idx) && !showResults && (
                  <XCircle className="h-3.5 w-3.5 shrink-0 opacity-50" />
                )}
                {showResults && matches.has(idx) && (
                  correctMatches.has(idx) ? 
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> :
                    <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground text-center mb-3">Párok</p>
          {rightWords.map((word, idx) => (
            <motion.button
              key={`right-${idx}`}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleRightClick(idx)}
              disabled={Array.from(matches.values()).includes(idx)}
              className={`
                w-full px-3 py-2.5 rounded-xl border-2 text-sm font-medium
                transition-all cursor-pointer
                ${getRightColor(idx)}
                ${Array.from(matches.values()).includes(idx) ? "opacity-60" : ""}
              `}
            >
              <span className="truncate">{word}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Results */}
      {showResults ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={correctCount === leftWords.length ? 
            "border-green-500/30 bg-green-500/5" : 
            "border-amber-500/30 bg-amber-500/5"
          }>
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-2">
                {correctCount === leftWords.length ? "🎉" : "💪"}
              </div>
              <p className="text-lg font-bold">
                {correctCount} / {leftWords.length} helyes
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {correctCount === leftWords.length
                  ? "Minden szót helyesen párosítottál!"
                  : "Nézd meg a pirossal jelölt párokat!"}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setMatches(new Map());
              setSelected({ left: null, right: null });
            }}
            disabled={matches.size === 0}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Újrakezdés
          </Button>
          <Button onClick={handleCheck} disabled={!allMatched} size="lg" className="gap-2">
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
function CompletedScreen({
  score,
  maxScore,
  assignmentType,
  onSubmit,
  submitting,
  submitted,
  studentEmail,
}: {
  score: number;
  maxScore: number;
  assignmentType: string;
  onSubmit: () => void;
  submitting: boolean;
  submitted: boolean;
  studentEmail: string;
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
  const [taskScore, setTaskScore] = useState(0);
  const [taskMaxScore, setTaskMaxScore] = useState(100);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [taskAnswers, setTaskAnswers] = useState<any>(null);
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
    const score = Math.round((correct / answers.length) * 100);
    setTaskScore(score);
    setTaskMaxScore(100);
    setTaskCompleted(true);
    setTaskAnswers({ blanks: answers });
    timer.stop();
  };

  const handleWordMatchingComplete = (answers: { word: string; selectedDefinition: string; correctDefinition: string }[]) => {
    const correct = answers.filter(
      (a) => a.selectedDefinition === a.correctDefinition
    ).length;
    const score = Math.round((correct / answers.length) * 100);
    setTaskScore(score);
    setTaskMaxScore(100);
    setTaskCompleted(true);
    setTaskAnswers({ matches: answers });
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

      // Use the submitAssignment mutation
      const submitMutation = /* GraphQL */ `
        mutation SubmitAssignment(
          $assignmentId: ID!
          $studentId: ID!
          $answers: AWSJSON!
          $timeSpentSeconds: Int
        ) {
          submitAssignment(
            assignmentId: $assignmentId
            studentId: $studentId
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

      // Also create a simple submission with email for tracking
      const createSubmissionMutation = /* GraphQL */ `
        mutation CreateAssignmentSubmission($input: CreateAssignmentSubmissionInput!) {
          createAssignmentSubmission(input: $input) {
            id
          }
        }
      `;

      const now = new Date().toISOString();

      await client.graphql({
        query: createSubmissionMutation,
        variables: {
          input: {
            assignmentId: id,
            teacherId: assignment.teacherId,
            assignmentType: assignment.assignmentType,
            studentEmail: studentEmail.trim().toLowerCase(),
            submittedAt: now,
            status: "submitted",
            score: taskScore,
            maxScore: taskMaxScore,
            timeSpentSeconds: timer.seconds,
            answers: taskAnswers ? JSON.stringify(taskAnswers) : null,
          },
        },
        authMode: "apiKey",
      });

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

  // Not found
  if (!assignment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-bold mb-2">Nem található feladat</h2>
            <p className="text-muted-foreground">
              Ez a feladat már nem elérhető vagy hibás a link.
            </p>
          </CardContent>
        </Card>
      </div>
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
      case "fill_blanks": return "Szókitöltés";
      case "word_matching": return "Szópárosítás";
      case "custom_words": return "Szógyakorlás";
      default: return "Olvasási feladat";
    }
  };

  // Parse blank positions JSON
  const parsedBlanks: BlankPosition[] = (() => {
    if (!assignment.blankPositions) return [];
    try {
      const parsed = typeof assignment.blankPositions === "string"
        ? JSON.parse(assignment.blankPositions)
        : assignment.blankPositions;
      return Array.isArray(parsed) ? parsed : [];
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
              ) : assignment.assignmentType === "word_matching" && assignment.matchingWords && assignment.matchingWords.length > 0 ? (
                <WordMatchingTask
                  words={assignment.matchingWords}
                  storyContent={assignment.storyContent}
                  onComplete={handleWordMatchingComplete}
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
