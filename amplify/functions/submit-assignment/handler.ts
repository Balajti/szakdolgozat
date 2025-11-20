import type { Schema } from '../../data/resource';
import { DynamoDBDataClient } from '../shared/dynamodb-client';

type SubmitAssignmentHandler = Schema['submitAssignment']['functionHandler'];

const dbClient = new DynamoDBDataClient();

interface FillBlanksAnswer {
  blankIndex: number;
  answer: string;
  correctAnswer: string;
}

interface WordMatchingAnswer {
  word: string;
  selectedDefinition: string;
  correctDefinition: string;
}

/**
 * Processes assignment submissions with automatic scoring
 * Supports different assignment types:
 * - basic: No scoring, just marks as completed
 * - fill_blanks: Compares student answers with correct words
 * - word_matching: Validates word-definition matches
 * - custom_words: Checks if required words are used
 */
export const handler: SubmitAssignmentHandler = async (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const {
    assignmentId,
    studentId,
    answers,
    timeSpentSeconds
  } = event.arguments;

  try {
    // Fetch the assignment
    const assignment = await dbClient.get('Assignment', assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }

    // Fetch student profile for name
    const studentProfile = await dbClient.get('StudentProfile', studentId);
    const studentName = studentProfile?.name as string || 'Student';

    const assignmentType = assignment.assignmentType as string;
    const teacherId = assignment.teacherId as string;

    // Calculate score based on assignment type
    let score = 0;
    let maxScore = 100;
    let feedback = '';

    switch (assignmentType) {
      case 'basic':
        // Basic story reading - full points for completion
        score = 100;
        maxScore = 100;
        feedback = 'Great job completing the story!';
        break;

      case 'fill_blanks':
        const fillBlanksResult = scoreFillBlanks(
          answers,
          assignment.blankPositions,
          assignment.requiredWords as string[]
        );
        score = fillBlanksResult.score;
        maxScore = fillBlanksResult.maxScore;
        feedback = fillBlanksResult.feedback;
        break;

      case 'word_matching':
        const wordMatchingResult = scoreWordMatching(
          answers,
          assignment.matchingWords as string[]
        );
        score = wordMatchingResult.score;
        maxScore = wordMatchingResult.maxScore;
        feedback = wordMatchingResult.feedback;
        break;

      case 'custom_words':
        // Check if student used the required words in their story
        const customWordsResult = scoreCustomWords(
          answers,
          assignment.requiredWords as string[]
        );
        score = customWordsResult.score;
        maxScore = customWordsResult.maxScore;
        feedback = customWordsResult.feedback;
        break;

      default:
        throw new Error(`Unsupported assignment type: ${assignmentType}`);
    }

    const now = new Date().toISOString();

    // Create submission record
    const submission = {
      assignmentId,
      studentId,
      teacherId,
      assignmentType,
      answers,
      score,
      maxScore,
      submittedAt: now,
      feedback,
      timeSpentSeconds: timeSpentSeconds || 0,
      createdAt: now,
      updatedAt: now
    };

    const savedSubmission = await dbClient.put('AssignmentSubmission', submission);

    // Update assignment status if needed
    await dbClient.update('Assignment', assignmentId, {
      status: 'submitted'
    });

    // Track words that student struggled with (score < 70%)
    const strugglingWords: string[] = [];
    if (assignmentType === 'fill_blanks' && answers.blanks) {
      answers.blanks.forEach((blank: FillBlanksAnswer) => {
        if (blank.answer.toLowerCase() !== blank.correctAnswer.toLowerCase()) {
          strugglingWords.push(blank.correctAnswer);
        }
      });
    }

    // Create submission summary for teacher dashboard
    await dbClient.put('SubmissionSummary', {
      assignmentId,
      teacherId,
      studentId,
      studentName,
      submittedAt: now,
      score,
      unknownWords: strugglingWords,
      createdAt: now,
      updatedAt: now
    });

    return {
      id: savedSubmission.id as string,
      assignmentId,
      studentId,
      score,
      maxScore,
      percentage: Math.round((score / maxScore) * 100),
      feedback,
      submittedAt: now,
      passed: score >= maxScore * 0.7 // 70% passing grade
    };

  } catch (error) {
    console.error('Error submitting assignment:', error);
    throw error;
  }
};

/**
 * Scores fill-in-the-blanks assignments
 */
function scoreFillBlanks(
  answers: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  _blankPositions: unknown, // eslint-disable-line @typescript-eslint/no-unused-vars
  _requiredWords: string[] // eslint-disable-line @typescript-eslint/no-unused-vars
): { score: number; maxScore: number; feedback: string } {
  if (!answers.blanks || !Array.isArray(answers.blanks)) {
    return { score: 0, maxScore: 100, feedback: 'No answers provided' };
  }

  const blanks = answers.blanks as FillBlanksAnswer[];
  const totalBlanks = blanks.length;
  let correctCount = 0;

  blanks.forEach((blank: FillBlanksAnswer) => {
    const studentAnswer = blank.answer.toLowerCase().trim();
    const correctAnswer = blank.correctAnswer.toLowerCase().trim();
    
    // Allow for minor variations (plurals, verb forms)
    if (studentAnswer === correctAnswer || 
        studentAnswer === correctAnswer + 's' ||
        correctAnswer === studentAnswer + 's' ||
        studentAnswer.startsWith(correctAnswer) ||
        correctAnswer.startsWith(studentAnswer)) {
      correctCount++;
    }
  });

  const score = Math.round((correctCount / totalBlanks) * 100);
  const feedback = `You got ${correctCount} out of ${totalBlanks} words correct!`;

  return { score, maxScore: 100, feedback };
}

/**
 * Scores word matching assignments
 */
function scoreWordMatching(
  answers: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  _matchingWords: string[] // eslint-disable-line @typescript-eslint/no-unused-vars
): { score: number; maxScore: number; feedback: string } {
  if (!answers.matches || !Array.isArray(answers.matches)) {
    return { score: 0, maxScore: 100, feedback: 'No answers provided' };
  }

  const matches = answers.matches as WordMatchingAnswer[];
  const totalWords = matches.length;
  let correctCount = 0;

  matches.forEach((match: WordMatchingAnswer) => {
    if (match.selectedDefinition === match.correctDefinition) {
      correctCount++;
    }
  });

  const score = Math.round((correctCount / totalWords) * 100);
  const feedback = `You matched ${correctCount} out of ${totalWords} words correctly!`;

  return { score, maxScore: 100, feedback };
}

/**
 * Scores custom words assignments
 */
function scoreCustomWords(
  answers: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  requiredWords: string[]
): { score: number; maxScore: number; feedback: string } {
  if (!answers.story || typeof answers.story !== 'string') {
    return { score: 0, maxScore: 100, feedback: 'No story provided' };
  }

  const story = answers.story.toLowerCase();
  const totalWords = requiredWords.length;
  let usedCount = 0;

  requiredWords.forEach((word: string) => {
    if (story.includes(word.toLowerCase())) {
      usedCount++;
    }
  });

  const score = Math.round((usedCount / totalWords) * 100);
  const feedback = `You used ${usedCount} out of ${totalWords} required words in your story!`;

  return { score, maxScore: 100, feedback };
}
