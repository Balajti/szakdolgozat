export const CEFR_LEVELS = [
  { value: "A1", label: "A1 – Kezdő" },
  { value: "A2", label: "A2 – Alapszint" },
  { value: "B1", label: "B1 – Küszöbszint" },
  { value: "B2", label: "B2 – Középszint" },
  { value: "C1", label: "C1 – Felsőfok" },
  { value: "C2", label: "C2 – Mesterszint" },
];

export const STORY_LENGTH_OPTIONS = [
  { value: "short", label: "Rövid (150 szó)" },
  { value: "medium", label: "Közepes (250 szó)" },
  { value: "long", label: "Hosszú (400 szó)" },
];

export const WORD_DIFFICULTY = [
  {
    value: "known",
    label: "Ismert szavak",
    description: "Gyakorolt szókincs, amit már magabiztosan használsz.",
  },
  {
    value: "learning",
    label: "Tanulás alatt",
    description: "Friss szavak, amelyek gyakorlást igényelnek.",
  },
  {
    value: "unknown",
    label: "Ismeretlen szavak",
    description: "Új szókincs, amit el szeretnél sajátítani.",
  },
];

export const WORDNEST_COLORS = {
  primary: "#3B82F6",
  secondary: "#FACC15",
  accent: "#10B981",
  background: "#F9FAFB",
  foreground: "#111827",
};

export const STORY_PROMPTS = {
  placementTest:
    "You are WordNest, an English tutor for Hungarian children. Generate an 80-word A1 story with max 8 words per sentence. Use simple tense and incorporate both basic and slightly harder words. End with a gentle question.",
  personalized: (
    level: string,
    age: number,
  ) =>
    `Create a contextual English story for a ${age}-year-old learner at ${level} level. Use mostly known words and inject 5-10% new vocabulary from the unknown list. Keep sentences short, grammar simple, and end with a reflective prompt.`,
  teacherStory:
    "Generate a 100-200 word English story for classrooms. Include all required words, exclude forbidden words, and keep the tone encouraging and culturally sensitive.",
};
