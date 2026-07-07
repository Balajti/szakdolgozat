import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

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

export async function POST(request: NextRequest) {
  let word = '';
  let targetLanguage = 'hu';
  let sourceLanguage = 'en';

  try {
    const body = await request.json();
    word = body.word;
    targetLanguage = body.targetLanguage || 'hu';
    sourceLanguage = body.sourceLanguage || 'en';

    if (!word) {
      return NextResponse.json(
        { error: 'word is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a language learning assistant.Provide comprehensive information about the English word "${word}" for a Hungarian student learning English.

Analyze the word and provide:
1. Hungarian translation
2. Part of speech(noun, verb, adjective, etc.) - in Hungarian
3. Phonetic pronunciation(IPA format if possible)
  4. If it's a verb: provide past tense and future tense forms
5. If it's a noun: provide plural form
6. A natural example sentence using this word in English(NOT a generic template)
7. Hungarian translation of the example sentence
8. Brief usage notes in Hungarian explaining when / how to use this word

  ** Format your response as JSON:**
  {
    "word": "${word}",
    "translation": "Hungarian translation here",
    "partOfSpeech": "főnév/ige/melléknév/stb (in Hungarian)",
    "phonetic": "pronunciation in IPA format or simple phonetic",
    "pastTense": "past tense form (only for verbs, otherwise null)",
    "futureTense": "will + verb form (only for verbs, otherwise null)",
    "pluralForm": "plural form (only for nouns, otherwise null)",
    "exampleSentence": "A natural, creative example sentence in English using the word",
    "exampleTranslation": "Hungarian translation of the example sentence",
    "usageNotes": "Brief explanation in Hungarian of when and how to use this word"
  }

Important:
- Make the example sentence natural and contextual, not a template
  - Write usageNotes in Hungarian
    - Write partOfSpeech in Hungarian(főnév, ige, melléknév, határozószó, etc.)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No response from Gemini API');
    }

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Gemini response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as WordDetails;

    const result: WordDetails = {
      word: parsed.word || word,
      translation: parsed.translation || word,
      sourceLanguage,
      targetLanguage,
      exampleSentence: parsed.exampleSentence || `Example with ${word}.`,
      exampleTranslation: parsed.exampleTranslation || '',
      phonetic: parsed.phonetic || null,
      partOfSpeech: parsed.partOfSpeech || null,
      pastTense: parsed.pastTense || null,
      futureTense: parsed.futureTense || null,
      pluralForm: parsed.pluralForm || null,
      usageNotes: parsed.usageNotes || null,
    };

    return NextResponse.json(result);
  } catch (error) {
    // No fake fallback translation: surface the failure so the UI can show a
    // proper error instead of caching (and possibly saving) garbage data.
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'translation_failed', word },
      { status: 502 }
    );
  }
}
