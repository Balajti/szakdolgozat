"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import {
  BookOpen,
  Check,
  Flame,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  Volume2,
  TrendingUp,
  Clock,
  Calendar,
  Award,
  Activity,
  BarChart,
  Zap,
} from "lucide-react";

import { PortalShell } from "@/components/layout/portal-shell";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStudentDashboard } from "@/lib/hooks/use-student-dashboard";
import { useGenerateStory, useUpdateWordMastery } from "@/lib/hooks/use-mutations";
import { cn } from "@/lib/utils";
import type { Story, StudentProfile, Word } from "@/lib/types";
import { ensureAmplifyConfigured } from "@/lib/api/config";

const masteryLabels: Record<Word["mastery"], string> = {
  known: "Ismert",
  learning: "Tanulás alatt",
  unknown: "Ismeretlen",
};

const masteryAccent: Record<Word["mastery"], string> = {
  known: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  learning: "bg-sky-100 text-sky-900 ring-sky-200",
  unknown: "bg-amber-100 text-amber-900 ring-amber-200",
};

const masteryBadgeAccent: Record<Word["mastery"], string> = {
  known: "bg-emerald-600/10 text-emerald-700",
  learning: "bg-sky-600/10 text-sky-700",
  unknown: "bg-amber-500/10 text-amber-700",
};

export default function StudentPortalPage() {
  useEffect(() => {
    ensureAmplifyConfigured();
  }, []);
  const { data, isLoading, isFetching, error } = useStudentDashboard();

  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>("");
  const [wordStatuses, setWordStatuses] = useState<Record<string, Word["mastery"]>>({});
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [isStoryDialogOpen, setStoryDialogOpen] = useState(false);
  const [generatedStory, setGeneratedStory] = useState<Story | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
    const updateWordMasteryMutation = useUpdateWordMastery();
    const generateStoryMutation = useGenerateStory();

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [readingError, setReadingError] = useState<string | null>(null);

  useEffect(() => {
    const profileData = data?.profile;
    if (!profileData) return;

    const updatedStories = profileData.stories;
    const defaultStatuses = Object.fromEntries(
      profileData.words.map((word) => [word.id, word.mastery] as const),
    ) as Record<string, Word["mastery"]>;

    setStories(updatedStories);
    setWordStatuses(defaultStatuses);
    setSelectedStoryId((prev) =>
      prev && updatedStories.some((story) => story.id === prev)
        ? prev
        : updatedStories[0]?.id ?? "",
    );

    const initialStory = updatedStories[0];
    const fallbackWordId =
      initialStory?.unknownWordIds.find((id) => defaultStatuses[id] !== "known") ??
      initialStory?.unknownWordIds[0] ??
      profileData.words[0]?.id ??
      null;

    setActiveWordId(fallbackWordId);
  }, [data?.profile]);

  const selectedStory = useMemo<Story | undefined>(
    () => stories.find((story) => story.id === selectedStoryId),
    [stories, selectedStoryId],
  );

  const wordLookup = useMemo(() => {
    const entries = new Map<string, Word>();
    (data?.profile?.words ?? []).forEach((word) => entries.set(word.text.toLowerCase(), word));
    return entries;
  }, [data?.profile?.words]);

  const activeWord = activeWordId
    ? data?.profile?.words.find((word) => word.id === activeWordId)
    : undefined;

  const masteryCounts = useMemo(() => {
    return (data?.profile?.words ?? []).reduce(
      (acc, word) => {
        const mastery = wordStatuses[word.id];
        if (mastery) {
          acc[mastery] += 1;
        }
        return acc;
      },
      { known: 0, learning: 0, unknown: 0 } as Record<Word["mastery"], number>,
    );
  }, [data?.profile?.words, wordStatuses]);

  const vocabularyProgress = Math.round(
    (masteryCounts.known / Math.max((data?.profile?.words.length ?? 0), 1)) * 100,
  );

  const storyTokens = useMemo(() => {
    if (!selectedStory) {
      return [];
    }

    return selectedStory.content.split(/(\s+)/).map((token, index) => {
      const normalized = token.replace(/[^\p{L}\p{N}\-']+/gu, "").toLowerCase();
      const matchingWord = normalized ? wordLookup.get(normalized) : undefined;

      if (!matchingWord) {
        return (
          <span key={`${token}-${index}`} className="text-lg leading-relaxed">
            {token}
          </span>
        );
      }

      const mastery = wordStatuses[matchingWord.id] ?? matchingWord.mastery;

      return (
        <Tooltip key={`${matchingWord.id}-${index}`}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setActiveWordId(matchingWord.id)}
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-lg font-medium leading-relaxed transition",
                "ring-2 ring-offset-2 ring-offset-white",
                masteryAccent[mastery],
                activeWordId === matchingWord.id && "ring-foreground",
              )}
            >
              {token}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-background/90">
                {matchingWord.text}
              </p>
              <p className="text-xs text-background/70">
                {matchingWord.translation}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    });
  }, [selectedStory, wordLookup, wordStatuses, activeWordId]);

  const achievements = useMemo(
    () => (data?.profile?.achievements ?? []).slice(0, 3),
    [data?.profile?.achievements],
  );

  useEffect(() => {
    if (!readingError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setReadingError(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [readingError]);

  useEffect(() => () => {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    speechRef.current = null;
  }, []);

  // removed local story synthesis; using backend generateStory

  const handleGenerateStory = async () => {
    if (isGeneratingStory) {
      return;
    }

    setIsGeneratingStory(true);
    setReadingError(null);

    try {
      const profile = data!.profile;
      const birthdayYear = profile.birthday ? new Date(profile.birthday).getFullYear() : undefined;
      const currentYear = new Date().getFullYear();
      const age = birthdayYear ? Math.max(5, Math.min(18, currentYear - birthdayYear)) : 12;

      const knownWords = profile.words.filter((w) => w.mastery === "known").map((w) => w.text);
      const practiceWords = profile.words.filter((w) => w.mastery !== "known").map((w) => w.text);

      const result = await generateStoryMutation.mutateAsync({
        level: profile.level,
        age,
        knownWords: knownWords.slice(0, 50),
        unknownWords: practiceWords.slice(0, 25),
        requiredWords: [],
        excludedWords: [],
        mode: "personalized",
      });

      const newStory = result.story;
      setStories((prev) => [newStory, ...prev]);
      setGeneratedStory(newStory);
      setSelectedStoryId(newStory.id);
      setActiveWordId(newStory.unknownWordIds[0] ?? null);
      setStoryDialogOpen(true);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleReadAloud = () => {
    setReadingError(null);

    if (!selectedStory) {
      setReadingError("Válassz egy történetet a felolvasáshoz.");
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setReadingError("A böngésződ nem támogatja a hangos felolvasást.");
      return;
    }

    const synth = window.speechSynthesis;

    if (isReadingAloud) {
      synth.cancel();
      setIsReadingAloud(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(selectedStory.content);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => {
      setIsReadingAloud(false);
    };
    utterance.onerror = () => {
      setIsReadingAloud(false);
      setReadingError("Nem sikerült elindítani a felolvasást. Próbáld újra később.");
    };

    speechRef.current = utterance;
    setIsReadingAloud(true);
    synth.cancel();
    synth.speak(utterance);
  };

  const handleStoryChange = (storyId: string) => {
    setSelectedStoryId(storyId);
    const story = stories.find((item) => item.id === storyId);

    if (!story) {
      return;
    }

    const fallbackWordId =
      story.unknownWordIds.find((id) => wordStatuses[id] !== "known") ??
      story.unknownWordIds[0] ??
      data?.profile?.words[0]?.id ??
      null;

    setActiveWordId(fallbackWordId);
  };

  const handleMasteryUpdate = async (wordId: string, mastery: Word["mastery"]) => {
    setWordStatuses((prev) => ({ ...prev, [wordId]: mastery }));
    try {
      await updateWordMasteryMutation.mutateAsync({ studentId: data!.profile.id, wordId, mastery });
    } catch {
      // Revert on error
      setWordStatuses((prev) => ({ ...prev, [wordId]: (data!.profile.words.find((w) => w.id === wordId)?.mastery ?? prev[wordId]) }));
    }
  };

  if (error) {
    return (
      <PortalShell backHref="/" backLabel="Vissza a kezdőlapra" sidebar={<div />}> 
        <Alert variant="destructive" title="Hiba történt" description="Nem sikerült betölteni a diák adatait. Próbáld újra később." />
      </PortalShell>
    );
  }

  if (isLoading || !data?.profile) {
    return (
      <PortalShell backHref="/" backLabel="Vissza a kezdőlapra" sidebar={<div />}> 
        <Alert variant="info" title="Betöltés" description="A diák irányítópult adatainak betöltése folyamatban." />
      </PortalShell>
    );
  }

  const profile = data.profile;

  return (
    <TooltipProvider delayDuration={120}>
      <PortalShell
        backHref="/"
        backLabel="Vissza a kezdőlapra"
        sidebar={
          <StudentSidebar
            profile={profile}
            activeWordId={activeWordId}
            onSelectWord={setActiveWordId}
            wordStatuses={wordStatuses}
          />
        }
        topActions={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={handleReadAloud}
              disabled={!selectedStory}
            >
              <Volume2
                className={cn("size-4", isReadingAloud ? "text-primary animate-pulse" : undefined)}
              />
              {isReadingAloud ? "Felolvasás leállítása" : "Hangos felolvasás"}
            </Button>
            <Button className="gap-2" onClick={handleGenerateStory} disabled={isGeneratingStory}>
              {isGeneratingStory ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isGeneratingStory ? "AI történet készítése..." : "Új AI történet"}
            </Button>
          </div>
        }
      >
        <div className="space-y-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Badge variant="outline" className="bg-primary/10 text-primary">
                SZINT {selectedStory?.level ?? profile.level}
              </Badge>
              <h1 className="font-display text-3xl text-foreground">
                Szia, {profile.name.split(" ")[0]}! Folytassuk a történetolvasást.
              </h1>
              <p className="text-muted-foreground">
                A mai célod: legalább 10 perc olvasás és 3 új szó felfedezése.
              </p>
            </div>
            <div className="flex gap-3">
              <MetricCard
                title="Olvasási sorozat"
                value={`${profile.streak} nap`}
                description="Ne hagyd megtörni a lendületet!"
                icon={<Flame className="size-5" />}
                className="w-56"
              />
              <MetricCard
                title="Szókincs"
                value={`${profile.vocabularyCount} szó`}
                description="Összegyűjtött kifejezések a fiókodban"
                icon={<Lightbulb className="size-5" />}
                className="w-56"
              />
            </div>
          </header>

          <div className="space-y-2">
            {isFetching && (
              <Alert variant="info" title="Adatok frissítése" description="A legfrissebb adataidat töltjük be." />
            )}
          </div>

          {/* Demo mode alert removed */}

          {readingError ? (
            <Alert
              variant="destructive"
              title="Hangos felolvasás nem érhető el"
              description={readingError}
            />
          ) : null}

          <Tabs defaultValue="stories" className="space-y-6">
            <TabsList>
              <TabsTrigger value="stories" className="gap-2">
                <BookOpen className="size-4" />
                Történetek
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart className="size-4" />
                Statisztikák
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="size-4" />
                Aktivitás
              </TabsTrigger>
            </TabsList>

            {/* Stories Tab */}
            <TabsContent value="stories" className="space-y-6">
              {stories.length === 0 ? (
                <Card className="border-border/40 bg-white">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="size-12 text-muted-foreground/40" />
                    <h3 className="mt-4 text-lg font-semibold text-foreground">Még nincs történeted</h3>
                    <p className="mt-2 text-center text-sm text-muted-foreground">
                      Kezdj el egy új történetet az AI segítségével!
                    </p>
                    <Button className="mt-6 gap-2" onClick={handleGenerateStory} disabled={isGeneratingStory}>
                      {isGeneratingStory ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                      {isGeneratingStory ? "AI történet készítése..." : "Új AI történet"}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Tabs value={selectedStoryId} onValueChange={handleStoryChange}>
                  <TabsList>
                    {stories.map((story) => (
                      <TabsTrigger key={story.id} value={story.id} className="gap-2">
                        <BookOpen className="size-4" />
                        {story.title}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                <TabsContent value={selectedStoryId} className="bg-white/80">
              <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <Card className="overflow-hidden border border-border/40 bg-gradient-to-br from-white/90 via-white to-primary/5">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl text-foreground">
                        {selectedStory?.title}
                      </CardTitle>
                      <CardDescription>
                        {selectedStory
                          ? `Készült: ${format(new Date(selectedStory.createdAt), "yyyy. MMMM d.", { locale: hu })}`
                          : "Válassz egy történetet"}
                      </CardDescription>
                    </div>
                    <Badge className="bg-primary/15 text-primary">{selectedStory?.level}</Badge>
                  </CardHeader>
                  <CardContent>
                    {selectedStory ? (
                      <ScrollArea className="h-[420px] pr-4">
                        <div className="space-y-6">
                          <div className="text-base leading-relaxed text-foreground/90">
                            {storyTokens}
                          </div>
                          <Alert
                            variant="info"
                            title="Tipp"
                            description="Kattints bármelyik kiemelt szóra, hogy gyorsan hozzáadd a szókincsedhez."
                          />
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="rounded-2xl bg-muted/60 p-8 text-center">
                        Válassz egy történetet a fenti listából.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-6">
                  <Card className="border border-border/40 bg-white/80">
                    <CardHeader className="space-y-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Szó részletek</CardTitle>
                        {activeWord ? (
                          <Badge className={cn("rounded-full", masteryBadgeAccent[wordStatuses[activeWord.id]])}>
                            {masteryLabels[wordStatuses[activeWord.id]]}
                          </Badge>
                        ) : null}
                      </div>
                      <CardDescription>
                        Megnézheted a példamondatot és frissítheted a tudásszinted.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {activeWord ? (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <h2 className="font-display text-3xl text-foreground">
                              {activeWord.text}
                            </h2>
                            <p className="text-base text-muted-foreground">
                              {activeWord.translation}
                            </p>
                          </div>
                          {activeWord.exampleSentence ? (
                            <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
                              „{activeWord.exampleSentence}”
                            </p>
                          ) : null}

                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleMasteryUpdate(activeWord.id, "unknown")}
                            >
                              <Target className="size-4" />
                              Gyakorlásra jelölöm
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleMasteryUpdate(activeWord.id, "learning")}
                            >
                              <BookOpen className="size-4" />
                              Jelölés tanulás alatt
                            </Button>
                            <Button
                              size="sm"
                              className="gap-2"
                              onClick={() => handleMasteryUpdate(activeWord.id, "known")}
                            >
                              <Check className="size-4" />
                              Megtanultam
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-muted/60 p-6 text-center text-sm text-muted-foreground">
                          Kattints egy szóra a történetben vagy a szójegyzékben.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border border-border/40 bg-white/80">
                    <CardHeader>
                      <CardTitle className="text-lg">Mai haladás</CardTitle>
                      <CardDescription>
                        Kövesd, hány új szót fedeztél fel és mennyit ismételtél.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Tanulási cél</span>
                          <span>{vocabularyProgress}% teljesítve</span>
                        </div>
                        <Progress value={vocabularyProgress} className="h-2" />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                        <div className="rounded-2xl bg-emerald-50/70 p-3">
                          <p className="font-semibold text-emerald-700">Ismert</p>
                          <p className="text-foreground">{masteryCounts.known}</p>
                        </div>
                        <div className="rounded-2xl bg-sky-50/70 p-3">
                          <p className="font-semibold text-sky-700">Tanulás alatt</p>
                          <p className="text-foreground">{masteryCounts.learning}</p>
                        </div>
                        <div className="rounded-2xl bg-amber-50/70 p-3">
                          <p className="font-semibold text-amber-700">Ismeretlen</p>
                          <p className="text-foreground">{masteryCounts.unknown}</p>
                        </div>
                      </div>

                      <Separator />

                      <ul className="space-y-3 text-sm">
                        {achievements.map((achievement) => (
                          <li key={achievement.id} className="flex items-center gap-3">
                            <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-lg">
                              {achievement.icon}
                            </span>
                            <div>
                              <p className="font-semibold text-foreground/90">
                                {achievement.title}
                              </p>
                              <p className="text-muted-foreground">
                                {achievement.description}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
                </TabsContent>
              </Tabs>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-4">
                <Card className="border-border/40 bg-gradient-to-br from-emerald-50 to-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Heti haladás
                    </CardTitle>
                    <TrendingUp className="size-4 text-emerald-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">+{masteryCounts.known}</div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((masteryCounts.known / Math.max(profile.words.length, 1)) * 100)}% ismert szó
                    </p>
                    <Progress 
                      value={(masteryCounts.known / Math.max(profile.words.length, 1)) * 100} 
                      className="mt-3 h-2 bg-emerald-100"
                    />
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-gradient-to-br from-sky-50 to-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Olvasási idő
                    </CardTitle>
                    <Clock className="size-4 text-sky-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">24 perc</div>
                    <p className="text-xs text-muted-foreground">
                      Ezen a héten
                    </p>
                    <div className="mt-3 flex gap-1">
                      {[3, 5, 2, 7, 4, 8, 6].map((height, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-sky-200"
                          style={{ height: `${height * 4}px` }}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-gradient-to-br from-amber-50 to-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Aktív napok
                    </CardTitle>
                    <Calendar className="size-4 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{profile.streak} / 7</div>
                    <p className="text-xs text-muted-foreground">
                      Sorozat fenntartva
                    </p>
                    <div className="mt-3 flex gap-1">
                      {[true, true, true, false, true, true, true].map((active, i) => (
                        <div
                          key={i}
                          className={`size-4 rounded-full ${
                            active ? "bg-amber-400" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-gradient-to-br from-purple-50 to-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Kitüntetések
                    </CardTitle>
                    <Award className="size-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{achievements.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Elért eredmények
                    </p>
                    <div className="mt-3 flex gap-1">
                      {achievements.map((achievement, i) => (
                        <span key={i} className="text-lg">
                          {achievement.icon}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/40 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="size-5 text-primary" />
                    Szókincs elsajátítás
                  </CardTitle>
                  <CardDescription>
                    Kövesd nyomon, hogyan fejlődik a szókincsed idővel
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-emerald-700">Ismert szavak</span>
                        <span className="text-2xl font-bold text-emerald-700">{masteryCounts.known}</span>
                      </div>
                      <Progress value={(masteryCounts.known / Math.max(profile.words.length, 1)) * 100} className="h-2 bg-emerald-100" />
                      <p className="text-xs text-muted-foreground">
                        {Math.round((masteryCounts.known / Math.max(profile.words.length, 1)) * 100)}% az összes szóból
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-sky-700">Tanulás alatt</span>
                        <span className="text-2xl font-bold text-sky-700">{masteryCounts.learning}</span>
                      </div>
                      <Progress value={(masteryCounts.learning / Math.max(profile.words.length, 1)) * 100} className="h-2 bg-sky-100" />
                      <p className="text-xs text-muted-foreground">
                        Folyamatban lévő szavak
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-amber-700">Ismeretlen</span>
                        <span className="text-2xl font-bold text-amber-700">{masteryCounts.unknown}</span>
                      </div>
                      <Progress value={(masteryCounts.unknown / Math.max(profile.words.length, 1)) * 100} className="h-2 bg-amber-100" />
                      <p className="text-xs text-muted-foreground">
                        Még feldolgozandó
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-border/40 bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="size-5 text-primary" />
                      Legutóbbi aktivitás
                    </CardTitle>
                    <CardDescription>
                      Az elmúlt napok eseményei
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[420px] pr-4">
                      <div className="space-y-4">
                        {stories.slice(0, 5).map((story) => (
                          <div key={story.id} className="flex gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <BookOpen className="size-5 text-primary" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                Elolvastam: {story.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(story.createdAt), "yyyy. MMM d. HH:mm", { locale: hu })}
                              </p>
                            </div>
                          </div>
                        ))}
                        {profile.words.slice(0, 3).map((word) => (
                          <div key={word.id} className="flex gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                              <Zap className="size-5 text-emerald-700" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                Új szó megtanulva: {word.text}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {word.lastReviewedAt ? format(new Date(word.lastReviewedAt), "yyyy. MMM d. HH:mm", { locale: hu }) : "Még nem ismételt"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="border-border/40 bg-gradient-to-br from-primary/5 to-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="size-5 text-primary" />
                      Személyre szabott javaslatok
                    </CardTitle>
                    <CardDescription>
                      Következő lépések a fejlődésedhez
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="rounded-lg border border-primary/20 bg-white p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Target className="size-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-foreground">
                              Ismételd át a tanulás alatti szavakat
                            </h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {masteryCounts.learning} szó vár rád. Napi 5 perc ismétlés sokat segíthet!
                            </p>
                            <Button size="sm" variant="outline" className="mt-3">
                              Kezdés
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100">
                            <BookOpen className="size-4 text-sky-700" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-foreground">
                              Olvasd el a következő történetet
                            </h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                              A szintednek megfelelő új tartalom vár rád.
                            </p>
                            <Button size="sm" variant="outline" className="mt-3" onClick={handleGenerateStory}>
                              Új történet generálása
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
                            <Flame className="size-4 text-amber-700" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-foreground">
                              Tartsd fenn a sorozatod!
                            </h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {profile.streak} napos sorozatod van. Ne hagyd megszakadni!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PortalShell>
      <Dialog
        open={isStoryDialogOpen}
        onOpenChange={(open) => {
          setStoryDialogOpen(open);
          if (!open) {
            setGeneratedStory(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Új AI történet elkészült</DialogTitle>
            <DialogDescription>
              A történetet hozzáadtuk a listádhoz. A kiemelt szavakat jelöld meg, hogy a WordNest figyelje a haladásodat.
            </DialogDescription>
          </DialogHeader>
          {generatedStory ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-muted/40 p-4">
                <p className="text-sm font-semibold text-muted-foreground/80">Cím</p>
                <p className="text-lg font-display text-foreground">{generatedStory.title}</p>
              </div>
              <ScrollArea className="max-h-64 rounded-2xl border border-border/40 bg-background/80 p-4">
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                  {generatedStory.content}
                </p>
              </ScrollArea>
              {generatedStory.unknownWordIds.length ? (
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Kiemelt szavak</p>
                  <p>
                    {generatedStory.unknownWordIds
                      .map((id) => profile.words.find((word) => word.id === id)?.text)
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Bezárás</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button>Olvasás megkezdése</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

type StudentSidebarProps = {
  profile: StudentProfile;
  activeWordId: string | null;
  wordStatuses: Record<string, Word["mastery"]>;
  onSelectWord: (wordId: string) => void;
};

function StudentSidebar({ profile, activeWordId, onSelectWord, wordStatuses }: StudentSidebarProps) {
  const masteryGroups: Array<{
    label: string;
    key: Word["mastery"];
  }> = [
    { label: "Tanulás alatt", key: "learning" },
    { label: "Ismeretlen", key: "unknown" },
    { label: "Ismert", key: "known" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="rounded-3xl bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Avatar className="border-white/40">
            <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.name} />
            <AvatarFallback>{profile.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-white/70">Tanuló profil</p>
            <p className="text-xl font-semibold">{profile.name}</p>
            <p className="text-sm text-white/70">Szint: {profile.level}</p>
          </div>
        </div>
        <div className="mt-6 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-white/80">
              <Flame className="size-4" /> Sorozat
            </span>
            <span className="font-semibold">{profile.streak} nap</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-white/80">
              <Lightbulb className="size-4" /> Szókincs
            </span>
            <span className="font-semibold">{profile.vocabularyCount} szó</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Szótárad
          </h3>
          <p className="text-xs text-muted-foreground">
            Kattints egy szóra, hogy részleteket láss és frissítsd a státuszát.
          </p>
        </div>

        <ScrollArea className="pr-2">
          <div className="space-y-5">
            {masteryGroups.map((group) => {
              const wordsInGroup = profile.words.filter(
                (word: Word) => wordStatuses[word.id] === group.key,
              );

              if (wordsInGroup.length === 0) {
                return null;
              }

              return (
                <div key={group.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {group.label}
                    </p>
                    <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                      {wordsInGroup.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {wordsInGroup.map((word: Word) => {
                      const isActive = activeWordId === word.id;
                      const mastery = wordStatuses[word.id];

                      return (
                        <button
                          key={word.id}
                          type="button"
                          onClick={() => onSelectWord(word.id)}
                          className={cn(
                            "flex w-full flex-col rounded-2xl border border-border/60 bg-white/80 p-3 text-left transition",
                            isActive && "border-foreground shadow-lg",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">
                              {word.text}
                            </p>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                masteryBadgeAccent[mastery],
                              )}
                            >
                              {masteryLabels[mastery]}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {word.translation}
                          </p>
                          {word.lastReviewedAt ? (
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              Utoljára: {formatDistanceToNow(new Date(word.lastReviewedAt), { addSuffix: true, locale: hu })}
                            </p>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
