"use client";

import { motion } from "motion/react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STORY_WORDS = [
  {
    word: "Lili",
    translation: "Lili",
    example: "Lili egy kíváncsi, bátor lány.",
    highlight: false,
  },
  {
    word: "tiptoed",
    translation: "lábujjhegyen lépett",
    example: "She tiptoed through the silent forest.",
    highlight: true,
  },
  {
    word: "into",
    translation: "be",
    example: "She walked into the magical library.",
    highlight: false,
  },
  {
    word: "the",
    translation: "a",
    example: "The lantern was bright.",
    highlight: false,
  },
  {
    word: "glowing",
    translation: "világító",
    example: "A glowing owl guided her way.",
    highlight: true,
  },
  {
    word: "treehouse",
    translation: "faház",
    example: "The treehouse was full of storybooks.",
    highlight: true,
  },
  {
    word: "library",
    translation: "könyvtár",
    example: "She borrowed a story from the library.",
    highlight: false,
  },
  {
    word: "where",
    translation: "ahol",
    example: "Where dreams grow wings.",
    highlight: false,
  },
  {
    word: "every",
    translation: "minden",
    example: "Every shelf glittered with tales.",
    highlight: false,
  },
  {
    word: "story",
    translation: "történet",
    example: "The story taught a new word.",
    highlight: false,
  },
  {
    word: "whispered",
    translation: "suttogott",
    example: "A wise fox whispered a word.",
    highlight: true,
  },
  {
    word: "its",
    translation: "az",
    example: "Its pages were golden.",
    highlight: false,
  },
  {
    word: "meaning",
    translation: "jelentése",
    example: "Do you know the meaning?",
    highlight: true,
  },
  {
    word: "in",
    translation: "magyarul",
    example: "The app explains it in Hungarian.",
    highlight: false,
  },
  {
    word: "Hungarian",
    translation: "magyar",
    example: "Hungarian translations appear instantly.",
    highlight: true,
  },
];

export function StoryPreview() {
  return (
    <Card className="border-none bg-white/80 shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="font-display text-2xl">Élményalapú történet</CardTitle>
        <Badge variant="outline">A2 • 10 éves</Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Csak vidd az egeret egy új szóra a fordításért.
        </p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap gap-x-2 gap-y-3 rounded-3xl bg-muted/60 p-6 text-lg leading-8 text-foreground"
        >
          {STORY_WORDS.map((token, index) => (
            <Tooltip key={`${token.word}-${index}`}>
              <TooltipTrigger
                className={`rounded-2xl px-2 py-1 transition-colors ${
                  token.highlight
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "hover:bg-secondary/20"
                }`}
              >
                {token.word}
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-left text-sm">
                <p className="font-semibold text-secondary">
                  {token.translation}
                </p>
                <p className="text-xs text-background/80">
                  {token.example}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
}
