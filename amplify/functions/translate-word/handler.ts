import type { Schema } from "../../data/resource";

type Handler = Schema["translateWord"]["functionHandler"];

interface MyMemoryResponse {
  responseData: {
    translatedText: string;
    match: number;
  };
  quotaFinished: boolean;
  responseStatus: number;
}

export const handler: Handler = async (event) => {
  const { word, sourceLanguage, targetLanguage } = event.arguments;

  if (!word || !targetLanguage) {
    throw new Error("word and targetLanguage are required");
  }

  const sourceLang = sourceLanguage || "en";

  try {
    // Use MyMemory Translation API (free tier: 1000 requests/day, no API key needed)
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${sourceLang}|${targetLanguage}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Translation API failed: ${response.statusText}`);
    }

    const data = await response.json() as MyMemoryResponse;

    if (data.responseStatus !== 200) {
      throw new Error("Translation service returned an error");
    }

    // Generate example sentence using the word
    const exampleSentence = generateExampleSentence(word, sourceLang);

    return {
      word,
      translation: data.responseData.translatedText,
      sourceLanguage: sourceLang,
      targetLanguage,
      exampleSentence,
      phonetic: null, // Could be added with another API if needed
    };
  } catch (error) {
    console.error("Translation error:", error);
    
    // Fallback: return the word itself if translation fails
    return {
      word,
      translation: word,
      sourceLanguage: sourceLang,
      targetLanguage,
      exampleSentence: `Try using "${word}" in your own sentence.`,
      phonetic: null,
    };
  }
};

function generateExampleSentence(word: string, language: string): string {
  if (language !== "en") {
    return `Example sentence with "${word}".`;
  }

  // Simple example sentence generator for common English words
  const templates = [
    `I saw a ${word} yesterday.`,
    `The ${word} was very interesting.`,
    `Can you help me with this ${word}?`,
    `She likes to ${word} every day.`,
    `They talked about the ${word} together.`,
    `This ${word} is important for learning.`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}
