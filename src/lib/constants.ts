export const CEFR_LEVELS = [
  { value: "A1", label: "A1 – Kezdő" },
  { value: "A2", label: "A2 – Alapszint" },
  { value: "B1", label: "B1 – Küszöbszint" },
  { value: "B2", label: "B2 – Középszint" },
  { value: "C1", label: "C1 – Felsőfok" },
  { value: "C2", label: "C2 – Mesterszint" },
];

// Story preferences - difficulty levels
export const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Kezdő (A1-A2)' },
  { value: 'intermediate', label: 'Középhaladó (B1-B2)' },
  { value: 'advanced', label: 'Haladó (C1-C2)' },
];

// Story preferences - available topics
export const STORY_TOPICS = [
  'Mindennapi élet',
  'Utazás',
  'Étel',
  'Technológia',
  'Sport',
  'Művészet',
  'Természet',
  'Történelem',
  'Tudomány',
  'Üzlet',
];

// Word mastery levels
export const WORD_DIFFICULTY = [
  {
    value: "known",
    label: "Ismert szavak",
    description: "Gyakorolt szókincs, amit már magabiztosan használsz.",
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
