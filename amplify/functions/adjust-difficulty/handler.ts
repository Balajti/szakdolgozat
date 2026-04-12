import { Schema } from '../../data/resource';
import { GoogleGenAI } from '@google/genai';

export const handler: Schema['adjustDifficulty']['functionHandler'] = async (event) => {
  const { text, currentLevel, targetLevel } = event.arguments;
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }

    const ai = new GoogleGenAI({ apiKey });

    // Use Gemini AI to adjust text difficulty
    const prompt = `You are an English language teacher. Adjust the following text from ${currentLevel} level to ${targetLevel} level.

Original text:
${text}

Requirements:
- Maintain the core meaning and message
- Adjust vocabulary complexity appropriately
- Adjust sentence structure complexity
- For lower levels (A1, A2, B1): Use simpler words, shorter sentences, more common vocabulary
- For higher levels (B2, C1, C2): Use more sophisticated vocabulary, complex sentence structures, idiomatic expressions

Provide only the adjusted text without any explanation or formatting.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.5,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    const adjustedText = response.text?.trim();
    if (!adjustedText) {
      throw new Error('No text received from AI response');
    }
    
    return {
      adjustedText,
    };
  } catch (error) {
    console.error('Error adjusting difficulty:', error);
    // Return original text if adjustment fails
    return {
      adjustedText: text,
    };
  }
};
