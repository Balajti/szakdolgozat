import { Schema } from '../../data/resource';
import { getDBClient } from '../shared/dynamodb-client';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export const handler: Schema['generateQuiz']['functionHandler'] = async (event) => {
  const { storyId } = event.arguments;
  
  try {
    const dbClient = getDBClient();
    
    // Get the story
    const story = await dbClient.get('Story', storyId);
    if (!story) {
      throw new Error('Story not found');
    }
    
    // Generate quiz questions using Gemini AI
    const prompt = `Based on the following English learning story, generate 5 multiple-choice questions to test comprehension. 
    
Story:
${story.content}

For each question, provide:
1. A clear question about the story
2. Four answer options (A, B, C, D)
3. The correct answer (A, B, C, or D)
4. A brief explanation of why that answer is correct

Format your response as valid JSON with this structure:
{
  "questions": [
    {
      "question": "What is the main topic?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "explanation": "Brief explanation"
    }
  ]
}`;

    let questions: Question[];
    try {
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
              temperature: 0.7,
              maxOutputTokens: 2000,
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate quiz with AI');
      }

      const data = await response.json();
      const generatedText = data.candidates[0].content.parts[0].text;
      
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }
      
      const parsedResponse = JSON.parse(jsonMatch[0]);
      questions = parsedResponse.questions || [];
      
      if (questions.length === 0) {
        throw new Error('No questions generated');
      }
    } catch (aiError) {
      console.error('AI generation failed, using fallback questions:', aiError);
      
      // Fallback: Generate simple questions based on story
      questions = [
        {
          question: "What is the main topic of this story?",
          options: [
            "The story's central theme",
            "A secondary detail",
            "An unrelated topic",
            "None of the above"
          ],
          correctAnswer: "A",
          explanation: "The story focuses on its main theme throughout."
        },
        {
          question: "Which best describes the story?",
          options: [
            "Educational and informative",
            "Confusing and unclear",
            "Too short",
            "Unrelated to English learning"
          ],
          correctAnswer: "A",
          explanation: "The story is designed for English language learning."
        }
      ];
    }
    
    // Save quiz questions to database
    const quizId = `quiz-${Date.now()}`;
    const savePromises = questions.slice(0, 5).map(async (q: Question, index: number) => {
      await dbClient.put('QuizQuestion', {
        id: `${quizId}-q${index + 1}`,
        storyId,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: story.difficulty || 'intermediate',
        createdAt: new Date().toISOString(),
      });
    });
    
    await Promise.all(savePromises);
    
    return {
      quizId,
      questions: JSON.stringify(questions.slice(0, 5)),
    };
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw new Error('Failed to generate quiz');
  }
};
