import { randomUUID } from 'node:crypto';
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
 * Processes assignment submissions with automatic scoring.
 * Students can be identified either by studentId (logged in) or by
 * studentEmail (public assignment links). Creates both the
 * AssignmentSubmission record and the SubmissionSummary used by the
 * teacher dashboard and analytics.
 */
export const handler: SubmitAssignmentHandler = async (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const {
    assignmentId,
    studentId,
    studentEmail,
    answers: rawAnswers,
    timeSpentSeconds
  } = event.arguments;

  try {
    if (!studentId && !studentEmail) {
      throw new Error('Either studentId or studentEmail is required');
    }

    // AWSJSON may arrive as a JSON string depending on the caller
    const answers = typeof rawAnswers === 'string' ? JSON.parse(rawAnswers) : rawAnswers;

    // Fetch the assignment
    const assignment = await dbClient.get('Assignment', assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }

    // Resolve the student profile: by id, or by email for public submissions
    let studentProfile = studentId ? await dbClient.get('StudentProfile', studentId) : null;
    const normalizedEmail = studentEmail ? String(studentEmail).trim().toLowerCase() : null;

    if (!studentProfile && normalizedEmail) {
      const scanResult = await dbClient.scan('StudentProfile', {
        filterExpression: '#email = :email',
        expressionAttributeNames: { '#email': 'email' },
        expressionAttributeValues: { ':email': normalizedEmail },
      });
      studentProfile = scanResult.items[0] ?? null;
    }

    const effectiveStudentId = (studentProfile?.id as string) || studentId || normalizedEmail!;
    const studentName =
      (studentProfile?.name as string) ||
      (normalizedEmail ? normalizedEmail.split('@')[0] : 'Student');

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
        const fillBlanksResult = scoreFillBlanks(answers);
        score = fillBlanksResult.score;
        maxScore = fillBlanksResult.maxScore;
        feedback = fillBlanksResult.feedback;
        break;

      case 'word_matching':
        const wordMatchingResult = scoreWordMatching(answers);
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
      studentId: studentProfile?.id ?? null,
      studentEmail: normalizedEmail,
      teacherId,
      assignmentType,
      answers: typeof rawAnswers === 'string' ? rawAnswers : JSON.stringify(rawAnswers),
      score,
      maxScore,
      submittedAt: now,
      feedback,
      timeSpentSeconds: timeSpentSeconds || 0,
      status: 'submitted',
      createdAt: now,
      updatedAt: now
    };

    const savedSubmission = await dbClient.put('AssignmentSubmission', {
      ...submission,
      id: randomUUID(),
    });

    // Track words that the student struggled with
    const strugglingWords: string[] = [];
    if (assignmentType === 'fill_blanks' && Array.isArray(answers?.blanks)) {
      answers.blanks.forEach((blank: FillBlanksAnswer) => {
        if (
          typeof blank?.answer === 'string' &&
          typeof blank?.correctAnswer === 'string' &&
          blank.answer.toLowerCase().trim() !== blank.correctAnswer.toLowerCase().trim()
        ) {
          strugglingWords.push(blank.correctAnswer);
        }
      });
    }

    // Create submission summary for the teacher dashboard / analytics
    await dbClient.put('SubmissionSummary', {
      id: randomUUID(),
      assignmentId,
      teacherId,
      studentId: effectiveStudentId,
      studentName,
      submittedAt: now,
      score,
      unknownWords: strugglingWords,
      createdAt: now,
      updatedAt: now
    });

    const safeMaxScore = maxScore > 0 ? maxScore : 100;

    return {
      id: savedSubmission.id as string,
      assignmentId,
      studentId: effectiveStudentId,
      score,
      maxScore: safeMaxScore,
      percentage: Math.round((score / safeMaxScore) * 100),
      feedback,
      submittedAt: now,
      passed: score >= safeMaxScore * 0.7 // 70% passing grade
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
  answers: any // eslint-disable-line @typescript-eslint/no-explicit-any
): { score: number; maxScore: number; feedback: string } {
  if (!answers?.blanks || !Array.isArray(answers.blanks) || answers.blanks.length === 0) {
    return { score: 0, maxScore: 100, feedback: 'No answers provided' };
  }

  const blanks = answers.blanks as FillBlanksAnswer[];
  const totalBlanks = blanks.length;
  let correctCount = 0;

  blanks.forEach((blank: FillBlanksAnswer) => {
    const studentAnswer = String(blank.answer ?? '').toLowerCase().trim();
    const correctAnswer = String(blank.correctAnswer ?? '').toLowerCase().trim();
    if (studentAnswer && studentAnswer === correctAnswer) {
      correctCount++;
    }
  });

  const score = Math.round((correctCount / totalBlanks) * 100);
  const feedback = `You got ${correctCount} out of ${totalBlanks} words correct!`;

  return { score, maxScore: 100, feedback };
}

/**
 * Scores word matching assignments (legacy)
 */
function scoreWordMatching(
  answers: any // eslint-disable-line @typescript-eslint/no-explicit-any
): { score: number; maxScore: number; feedback: string } {
  if (!answers?.matches || !Array.isArray(answers.matches) || answers.matches.length === 0) {
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
  if (!answers?.story || typeof answers.story !== 'string') {
    return { score: 0, maxScore: 100, feedback: 'No story provided' };
  }

  if (!Array.isArray(requiredWords) || requiredWords.length === 0) {
    return { score: 100, maxScore: 100, feedback: 'Story submitted!' };
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
