/**
 * Static question bank for the placement test (/student/placement).
 *
 * The test ladders through CEFR levels: at each level the student answers
 * QUESTIONS_PER_LEVEL randomly chosen items, and needs PASS_THRESHOLD correct
 * answers to advance. Static items keep the very first experience instant and
 * reliable — no AI round-trip, nothing to fail.
 */

export type PlacementLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const PLACEMENT_LEVELS: PlacementLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const QUESTIONS_PER_LEVEL = 3;
export const PASS_THRESHOLD = 2;

export interface PlacementQuestion {
  /** The question shown to the student (Hungarian instruction built in UI). */
  prompt: string;
  /** "vocab" = mit jelent a szó; "gap" = egészítsd ki a mondatot */
  kind: "vocab" | "gap";
  options: string[];
  correct: string;
}

export const LEVEL_DESCRIPTIONS: Record<PlacementLevel, string> = {
  A1: "Kezdő — ismered a legalapvetőbb szavakat és kifejezéseket. Rövid, egyszerű történetekkel indulunk.",
  A2: "Alapszint — boldogulsz a hétköznapi témákkal. Egyszerű, de már fordulatos történeteket kapsz.",
  B1: "Küszöbszint — magabiztosan olvasol ismerős témákról. Változatosabb szókincsű történetek várnak.",
  B2: "Középszint — összetettebb szövegeket is jól értesz. A történeteid árnyaltabb nyelvezetet használnak.",
  C1: "Felsőfok — igényes, választékos szövegeket olvasol. Kifinomult, gazdag szókincsű történeteket kapsz.",
  C2: "Mesterszint — anyanyelvi szinthez közeli értés. A legösszetettebb történeteken csiszolhatod a tudásod.",
};

export const PLACEMENT_QUESTIONS: Record<PlacementLevel, PlacementQuestion[]> = {
  A1: [
    { kind: "vocab", prompt: "apple", options: ["alma", "körte", "szék", "kutya"], correct: "alma" },
    { kind: "gap", prompt: "I ___ a student.", options: ["is", "am", "are", "be"], correct: "am" },
    { kind: "vocab", prompt: "dog", options: ["macska", "madár", "kutya", "hal"], correct: "kutya" },
    { kind: "gap", prompt: "She ___ two brothers.", options: ["have", "has", "is", "do"], correct: "has" },
    { kind: "vocab", prompt: "red", options: ["kék", "zöld", "piros", "sárga"], correct: "piros" },
    { kind: "gap", prompt: "We live ___ Budapest.", options: ["on", "at", "in", "to"], correct: "in" },
  ],
  A2: [
    { kind: "gap", prompt: "Yesterday I ___ to the cinema.", options: ["go", "went", "gone", "goes"], correct: "went" },
    { kind: "vocab", prompt: "cheap", options: ["drága", "olcsó", "gyors", "késő"], correct: "olcsó" },
    { kind: "gap", prompt: "There isn't ___ milk in the fridge.", options: ["some", "any", "no", "a"], correct: "any" },
    { kind: "vocab", prompt: "journey", options: ["utazás", "újság", "munka", "reggeli"], correct: "utazás" },
    { kind: "gap", prompt: "He is ___ than his brother.", options: ["tall", "tallest", "taller", "more tall"], correct: "taller" },
    { kind: "vocab", prompt: "borrow", options: ["elad", "kölcsönkér", "megjavít", "elveszít"], correct: "kölcsönkér" },
  ],
  B1: [
    { kind: "gap", prompt: "If it rains tomorrow, we ___ at home.", options: ["stay", "will stay", "stayed", "would stay"], correct: "will stay" },
    { kind: "vocab", prompt: "achieve", options: ["elér, megvalósít", "elkerül", "megbán", "felad"], correct: "elér, megvalósít" },
    { kind: "gap", prompt: "I've lived here ___ 2015.", options: ["for", "since", "from", "during"], correct: "since" },
    { kind: "vocab", prompt: "environment", options: ["környezet", "esemény", "élmény", "eszköz"], correct: "környezet" },
    { kind: "gap", prompt: "You ___ smoke in the hospital.", options: ["must", "mustn't", "don't have to", "should"], correct: "mustn't" },
    { kind: "vocab", prompt: "improve", options: ["ront", "fejleszt, javít", "bizonyít", "ígér"], correct: "fejleszt, javít" },
  ],
  B2: [
    { kind: "gap", prompt: "By the time we arrived, the film ___.", options: ["already started", "had already started", "has already started", "was already starting"], correct: "had already started" },
    { kind: "vocab", prompt: "reliable", options: ["megbízható", "fárasztó", "véletlen", "felesleges"], correct: "megbízható" },
    { kind: "gap", prompt: "The bridge ___ in 1849.", options: ["built", "was built", "is built", "has built"], correct: "was built" },
    { kind: "vocab", prompt: "curious", options: ["óvatos", "kíváncsi", "dühös", "csendes"], correct: "kíváncsi" },
    { kind: "gap", prompt: "I'd rather you ___ that again.", options: ["don't do", "didn't do", "won't do", "not do"], correct: "didn't do" },
    { kind: "vocab", prompt: "sustainable", options: ["fenntartható", "érthető", "elérhető", "látható"], correct: "fenntartható" },
  ],
  C1: [
    { kind: "gap", prompt: "___ had I closed the door when the phone rang.", options: ["Hardly", "Whenever", "Despite", "Although"], correct: "Hardly" },
    { kind: "vocab", prompt: "deteriorate", options: ["romlik", "elhatároz", "díszít", "eltérít"], correct: "romlik" },
    { kind: "gap", prompt: "The proposal was turned ___ by the committee.", options: ["off", "down", "over", "out"], correct: "down" },
    { kind: "vocab", prompt: "reluctant", options: ["lelkes", "vonakodó", "hálás", "gondtalan"], correct: "vonakodó" },
    { kind: "gap", prompt: "Had I known about the traffic, I ___ earlier.", options: ["left", "would have left", "would leave", "had left"], correct: "would have left" },
    { kind: "vocab", prompt: "thorough", options: ["alapos", "átmeneti", "makacs", "áttetsző"], correct: "alapos" },
  ],
  C2: [
    { kind: "vocab", prompt: "ubiquitous", options: ["mindenütt jelenlévő", "kétértelmű", "jelentéktelen", "egyhangú"], correct: "mindenütt jelenlévő" },
    { kind: "gap", prompt: "Not until the final results were published ___ the scale of the problem.", options: ["we grasped", "did we grasp", "we did grasp", "had we grasped"], correct: "did we grasp" },
    { kind: "vocab", prompt: "conundrum", options: ["fejtörő, rejtély", "egyezmény", "körforgás", "hozzájárulás"], correct: "fejtörő, rejtély" },
    { kind: "gap", prompt: "She spoke with such conviction that no one ___ to contradict her.", options: ["dared", "dare", "daring", "dares"], correct: "dared" },
    { kind: "vocab", prompt: "ephemeral", options: ["múlékony, tiszavirág-életű", "örökkévaló", "kézzelfogható", "fergeteges"], correct: "múlékony, tiszavirág-életű" },
    { kind: "gap", prompt: "___ the committee's objections, the plan went ahead.", options: ["Notwithstanding", "Nonetheless", "However", "Moreover"], correct: "Notwithstanding" },
  ],
};
