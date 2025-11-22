import { GoogleGenAI } from "@google/genai";
import type { Schema } from "../../data/resource";

type Handler = Schema["translateWord"]["functionHandler"];

interface WordDetails {
  word: string;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  exampleSentence: string;
  exampleTranslation: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  pastTense: string | null;
  futureTense: string | null;
  pluralForm: string | null;
  usageNotes: string | null;
}

export const handler: Handler = async (event) => {
  const { word, sourceLanguage, targetLanguage } = event.arguments;

  if (!word || !targetLanguage) {
    throw new Error("word and targetLanguage are required");
  }

  const sourceLang = sourceLanguage || "en";
  const apiKey = process.env.GEMINI_API_KEY;

  console.log("Translating word:", word, "from", sourceLang, "to", targetLanguage);

  if (!apiKey) {
    console.error("GEMINI_API_KEY not set, using fallback");
    return getFallbackTranslation(word, sourceLang, targetLanguage);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `You are a language learning assistant. Provide comprehensive information about the English word "${word}" for a Hungarian student learning English.

Analyze the word and provide:
1. Hungarian translation
2. Part of speech (noun, verb, adjective, etc.) - in Hungarian
3. Phonetic pronunciation (IPA format if possible)
4. If it's a verb: provide past tense and future tense forms
5. If it's a noun: provide plural form
6. A natural example sentence using this word in English (NOT a generic template)
7. Hungarian translation of the example sentence
8. Brief usage notes in Hungarian explaining when/how to use this word

**Format your response as JSON:**
{
  "word": "${word}",
  "translation": "Hungarian translation here",
  "partOfSpeech": "főnév/ige/melléknév/stb (in Hungarian)",
  "phonetic": "pronunciation in IPA format or simple phonetic",
  "pastTense": "past tense form (only for verbs, otherwise null)",
  "futureTense": "will + verb form (only for verbs, otherwise null)",
  "pluralForm": "plural form (only for nouns, otherwise null)",
  "exampleSentence": "A natural, creative example sentence in English using '${word}'",
  "exampleTranslation": "Hungarian translation of the example sentence",
  "usageNotes": "Brief explanation in Hungarian of when and how to use this word"
}

Important: 
- Make the example sentence natural and contextual, not a template
- Write usageNotes in Hungarian
- Write partOfSpeech in Hungarian (főnév, ige, melléknév, határozószó, etc.)`;

    console.log("Calling Gemini API for word translation...");
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini API");
    }

    console.log("Gemini response received, parsing...");
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from Gemini response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as WordDetails;
    console.log("Translation successful:", parsed.translation);

    return {
      word: parsed.word || word,
      translation: parsed.translation || word,
      sourceLanguage: sourceLang,
      targetLanguage,
      exampleSentence: parsed.exampleSentence || `Example with ${word}.`,
      exampleTranslation: parsed.exampleTranslation || null,
      phonetic: parsed.phonetic || null,
      partOfSpeech: parsed.partOfSpeech || null,
      pastTense: parsed.pastTense || null,
      futureTense: parsed.futureTense || null,
      pluralForm: parsed.pluralForm || null,
      usageNotes: parsed.usageNotes || null,
    };
  } catch (error) {
    console.error("Translation error:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    
    // Fallback: return basic translation
    return getFallbackTranslation(word, sourceLang, targetLanguage);
  }
};

function getFallbackTranslation(word: string, sourceLang: string, targetLang: string) {
  console.log("Using fallback translation for:", word);
  return {
    word,
    translation: `[Translation for "${word}"]`,
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    exampleSentence: `The student used the word "${word}" in their essay.`,
    exampleTranslation: targetLang === "hu" ? `A diák a "${word}" szót használta az esszéjében.` : null,
    phonetic: null,
    partOfSpeech: null,
    pastTense: null,
    futureTense: null,
    pluralForm: null,
    usageNotes: "Please ensure you have a stable internet connection for detailed translations.",
  };
}
