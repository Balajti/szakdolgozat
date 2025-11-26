"use client";

import { useState } from "react";
import { Loader2, Sparkles, BookOpen, List, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface StoryGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (assignment: GeneratedAssignment) => void;
}

interface HighlightedWord {
  word: string;
  offset: number;
  length: number;
}

interface GeneratedAssignment {
  title: string;
  content: string;
  level: string;
  assignmentType: string;
  highlightedWords?: HighlightedWord[];
  blankPositions?: HighlightedWord[];
  matchingWords?: string[];
}

const LEVELS = [
  { value: "A1", label: "A1 – Kezdő" },
  { value: "A2", label: "A2 – Alapszint" },
  { value: "B1", label: "B1 – Küszöbszint" },
  { value: "B2", label: "B2 – Középszint" },
  { value: "C1", label: "C1 – Felsőfok" },
  { value: "C2", label: "C2 – Mesterszint" },
];

const ASSIGNMENT_TYPES = [
  {
    value: "basic",
    label: "Történet olvasása",
    description: "Egyszerű történet generálása a megadott szinten, kiemelt szavakkal.",
    icon: BookOpen,
  },
  {
    value: "fill_blanks",
    label: "Lyukas szöveg",
    description: "A tanulónak be kell írnia a hiányzó szavakat a szövegbe.",
    icon: List,
  },
  {
    value: "word_matching",
    label: "Szópárosító",
    description: "A kiemelt szavak és jelentésük összepárosítása.",
    icon: Languages,
  },
];

export function StoryGenerationDialog({
  open,
  onOpenChange,
  onGenerated,
}: StoryGenerationDialogProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [level, setLevel] = useState("A2");
  const [assignmentType, setAssignmentType] = useState("basic");
  const [topic, setTopic] = useState("");
  const [customWords, setCustomWords] = useState("");

  const [blankRatio, setBlankRatio] = useState(0.3);
  const [pairCount, setPairCount] = useState(8);

  const handleGenerate = async () => {
    if (!level) {
      toast({
        title: "Hiányzó adat",
        description: "Válassz szintet a történethez.",
        variant: "destructive",
      });
      return;
    }

    if (!assignmentType) {
      toast({
        title: "Hiányzó adat",
        description: "Válassz feladat típust.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { client } = await import("@/lib/amplify-client");

      // Call story generation function
      const generateStoryMutation = /* GraphQL */ `
        mutation GenerateStory($level: String!, $topic: String, $customWords: [String], $mode: StoryGenerationMode!) {
          generateStory(level: $level, topic: $topic, customWords: $customWords, mode: $mode) {
            story {
              title
              content
              highlightedWords {
                word
                offset
                length
              }
            }
          }
        }
      `;

      const words = customWords
        .split(",")
        .map((w) => w.trim())
        .filter((w) => w.length > 0);

      const response = (await client.graphql({
        query: generateStoryMutation,
        variables: {
          level,
          topic: topic.trim() || null,
          customWords: words.length > 0 ? words : null,
          mode: "teacher",
        },
      })) as { data?: { generateStory?: { story?: { title?: string; content?: string; highlightedWords?: { word: string; offset: number; length: number }[] } } } };

      const storyData = response.data?.generateStory?.story;

      if (!storyData?.title || !storyData?.content) {
        throw new Error("No story data returned");
      }

      // Process based on assignment type
      const baseAssignment = {
        title: storyData.title,
        content: storyData.content,
        level,
        assignmentType,
      };

      let processedAssignment: GeneratedAssignment;
      if (assignmentType === "basic") {
        processedAssignment = {
          ...baseAssignment,
          highlightedWords: storyData.highlightedWords || [],
        };
      } else if (assignmentType === "fill_blanks") {
        // Generate blank positions from highlighted words using selected ratio
        const blanks = processBlankPositions(storyData.content, storyData.highlightedWords || [], blankRatio);
        processedAssignment = {
          ...baseAssignment,
          blankPositions: blanks,
        };
      } else if (assignmentType === "word_matching") {
        // Extract words for matching using selected count
        const matchingWords = extractMatchingWords(storyData.highlightedWords || [], pairCount);
        processedAssignment = {
          ...baseAssignment,
          matchingWords,
          highlightedWords: storyData.highlightedWords || [],
        };
      } else {
        processedAssignment = baseAssignment;
      }

      onGenerated(processedAssignment);
      onOpenChange(false);

      toast({
        title: "Sikeres generálás",
        description: "A feladat sikeresen létrehozva.",
      });
    } catch (error) {
      console.error("Error generating story:", error);
      toast({
        title: "Hiba",
        description: "Nem sikerült generálni a történetet.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const processBlankPositions = (content: string, highlightedWords: HighlightedWord[], ratio: number): HighlightedWord[] => {
    if (!highlightedWords || highlightedWords.length === 0) return [];

    // Calculate number of blanks based on ratio
    const numBlanks = Math.max(
      3,
      Math.floor(highlightedWords.length * ratio)
    );

    const shuffled = [...highlightedWords].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numBlanks);

    return selected.map((word) => ({
      word: word.word,
      offset: word.offset,
      length: word.length,
    }));
  };

  const extractMatchingWords = (highlightedWords: HighlightedWord[], count: number): string[] => {
    if (!highlightedWords || highlightedWords.length === 0) return [];

    // Select words for matching based on count
    const numWords = Math.min(count, Math.max(4, highlightedWords.length));
    const shuffled = [...highlightedWords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numWords).map((w) => w.word);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Feladat Generálás
          </DialogTitle>
          <DialogDescription>
            Adj meg egy szintet és témát, és az AI generál egy személyre szabott feladatot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Level Selection */}
          <div className="space-y-2">
            <Label htmlFor="level">Nyelvi szint *</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="level">
                <SelectValue placeholder="Válassz szintet" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((lvl) => (
                  <SelectItem key={lvl.value} value={lvl.value}>
                    {lvl.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Type */}
          <div className="space-y-3">
            <Label>Feladat típusa *</Label>
            <div className="space-y-2">
              {ASSIGNMENT_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-all ${assignmentType === type.value
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-muted/50"
                      }`}
                    onClick={() => setAssignmentType(type.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold">{type.label}</p>
                            <p className="text-sm text-muted-foreground mt-1 break-words">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Dynamic Fields based on Assignment Type */}
          {assignmentType === "fill_blanks" && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
              <div className="space-y-2">
                <Label>Hiányzó szavak aránya</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.1"
                    value={blankRatio}
                    onChange={(e) => setBlankRatio(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-right font-medium">
                    {Math.round(blankRatio * 100)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  A kiemelt szavak hány százaléka legyen üres hely.
                </p>
              </div>
            </div>
          )}

          {assignmentType === "word_matching" && (
            <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="pair-count">Párok száma</Label>
                <Select value={String(pairCount)} onValueChange={(v) => setPairCount(parseInt(v))}>
                  <SelectTrigger id="pair-count">
                    <SelectValue placeholder="Válassz darabszámot" />
                  </SelectTrigger>
                  <SelectContent>
                    {[4, 6, 8, 10, 12, 15].map((num) => (
                      <SelectItem key={num} value={String(num)}>
                        {num} pár
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Hány szópárt kelljen megtalálni a feladatban.
                </p>
              </div>
            </div>
          )}

          {/* Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">Téma (opcionális)</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="pl. utazás, ételek, hobbi..."
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Ha üresen hagyod, az AI véletlenszerű témát választ.
            </p>
          </div>

          {/* Custom Words */}
          <div className="space-y-2">
            <Label htmlFor="custom-words">Egyedi szavak (opcionális)</Label>
            <Textarea
              id="custom-words"
              value={customWords}
              onChange={(e) => setCustomWords(e.target.value)}
              placeholder="Szavak vesszővel elválasztva, pl: house, car, book..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Az AI ezeket a szavakat fogja beépíteni a történetbe.
            </p>
          </div>

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">AI Generálás</p>
                  <p>
                    A Gemini AI egy eredeti, érdekes történetet fog készíteni a megadott
                    paraméterek alapján. A generálás 10-30 másodpercet vesz igénybe.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={generating}
          >
            Mégse
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generálás...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generálás
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
