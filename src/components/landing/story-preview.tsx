"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Flame, Languages, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface StoryToken {
  word: string;
  after?: string;
  translation?: string;
  example?: string;
}

const STORY_TOKENS: StoryToken[] = [
  { word: "Lili" },
  {
    word: "tiptoed",
    translation: "lábujjhegyen lépett",
    example: "She tiptoed through the silent forest.",
  },
  { word: "into" },
  { word: "the" },
  {
    word: "glowing",
    translation: "világító",
    example: "A glowing owl guided her way.",
  },
  {
    word: "treehouse",
    translation: "faház",
    example: "The treehouse was full of storybooks.",
  },
  { word: "library" },
  { word: "where" },
  { word: "every" },
  { word: "story" },
  {
    word: "whispered",
    translation: "suttogott",
    example: "A wise fox whispered a word.",
  },
  { word: "its" },
  {
    word: "meaning",
    translation: "jelentése",
    example: "Do you know the meaning?",
  },
  { word: "in" },
  {
    word: "Hungarian",
    after: ".",
    translation: "magyar",
    example: "Hungarian translations appear instantly.",
  },
];

const CYCLE_MS = 2800;

export function StoryPreview() {
  const reduceMotion = useReducedMotion();

  const learnable = useMemo(
    () =>
      STORY_TOKENS.map((token, index) => ({ token, index })).filter(
        ({ token }) => Boolean(token.translation),
      ),
    [],
  );

  const [activeIndex, setActiveIndex] = useState(learnable[0].index);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Demonstrate the interaction on its own so the value is legible without a
  // mouse — the previous version only revealed translations on hover, which
  // said nothing at all on touch devices.
  useEffect(() => {
    if (hasInteracted || reduceMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const position = learnable.findIndex(({ index }) => index === current);
        return learnable[(position + 1) % learnable.length].index;
      });
    }, CYCLE_MS);

    return () => window.clearInterval(timer);
  }, [hasInteracted, learnable, reduceMotion]);

  const activeToken = STORY_TOKENS[activeIndex];

  const select = (index: number) => {
    setHasInteracted(true);
    setActiveIndex(index);
  };

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[3rem] bg-primary/15 blur-3xl"
      />

      <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-[0_45px_120px_-60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate font-display text-base text-foreground sm:text-lg">
              The Glowing Treehouse
            </p>
            <p className="text-xs text-muted-foreground">A2 szint • 10 éveseknek</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
              <Flame className="size-3.5" /> 7
            </span>
            <span className="hidden items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground sm:flex">
              <Volume2 className="size-3.5" /> Felolvasás
            </span>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-6">
          <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-2 font-display text-xl leading-9 text-foreground sm:text-2xl sm:leading-10">
            {STORY_TOKENS.map((token, index) => {
              if (!token.translation) {
                return (
                  <span key={`${token.word}-${index}`}>
                    {token.word}
                    {token.after}
                  </span>
                );
              }

              const isActive = index === activeIndex;

              return (
                <span key={`${token.word}-${index}`}>
                  <button
                    type="button"
                    onClick={() => select(index)}
                    onMouseEnter={() => select(index)}
                    onFocus={() => select(index)}
                    aria-pressed={isActive}
                    className={cn(
                      "rounded-lg px-1 underline decoration-dotted decoration-2 underline-offset-4 transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground decoration-transparent"
                        : "text-primary decoration-primary/40 hover:bg-primary/10",
                    )}
                  >
                    {token.word}
                  </button>
                  {token.after}
                </span>
              );
            })}
          </p>
        </div>

        <div className="border-t border-border/50 bg-muted/40 px-5 py-4 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex items-start gap-3"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Languages className="size-4" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="font-display text-base text-foreground">
                  {activeToken.word}
                  <span className="text-muted-foreground"> — </span>
                  <span className="text-primary">{activeToken.translation}</span>
                </p>
                <p className="text-sm italic text-muted-foreground">
                  {activeToken.example}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Koppints vagy vidd az egeret egy kiemelt szóra a fordításért.
      </p>
    </div>
  );
}
