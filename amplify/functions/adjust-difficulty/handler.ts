import { Schema } from '../../data/resource';

export const handler: Schema['adjustDifficulty']['functionHandler'] = async (event) => {
  const { text, currentLevel, targetLevel } = event.arguments;
  
  try {
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 2000,
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to adjust text difficulty');
    }

    const data = await response.json();
    const adjustedText = data.candidates[0].content.parts[0].text.trim();
    
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
