import type { Schema } from '../../data/resource';
import { DynamoDBDataClient, queryByIndex } from '../shared/dynamodb-client';

type GetAssignmentAnalyticsHandler = Schema['getAssignmentAnalytics']['functionHandler'];

const dbClient = new DynamoDBDataClient();

interface SubmissionData {
  score: number;
  maxScore: number;
  submittedAt: string;
  studentId?: string;
  studentEmail?: string;
  timeSpentSeconds?: number;
}

/**
 * Provides analytics for a specific assignment
 * Returns completion rates, average scores, struggling students, etc.
 */
export const handler: GetAssignmentAnalyticsHandler = async (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const { assignmentId, teacherId } = event.arguments;

  try {
    // Verify teacher owns this assignment
    const assignment = await dbClient.get('Assignment', assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }

    if (assignment.teacherId !== teacherId) {
      throw new Error('Unauthorized: You can only view analytics for your own assignments');
    }

    // Get all submissions for this assignment
    const submissions = await queryByIndex(
      'AssignmentSubmission',
      'byAssignmentId',
      'assignmentId',
      assignmentId,
      1000
    );

    // Calculate analytics
    const totalSubmissions = submissions.length;

    // Prefer the explicit recipient count from distribution, otherwise fall
    // back to the emails the assignment was sent to.
    const sentTo = Array.isArray(assignment.sentTo) ? assignment.sentTo : [];
    const recipientCount = (assignment.recipientCount as number) || sentTo.length;

    // Score statistics
    let totalScore = 0;
    let totalMaxScore = 0;
    let passedCount = 0;
    let totalTimeSpent = 0;

    const studentScores: { [key: string]: number } = {};

    submissions.forEach((sub: unknown) => {
      const submission = sub as SubmissionData;
      const maxScore = Number(submission.maxScore) > 0 ? Number(submission.maxScore) : 100;
      const score = Number(submission.score) || 0;

      totalScore += score;
      totalMaxScore += maxScore;

      const percentage = (score / maxScore) * 100;
      if (percentage >= 70) {
        passedCount++;
      }

      const studentKey = submission.studentId || submission.studentEmail || 'unknown';
      studentScores[studentKey] = percentage;

      if (submission.timeSpentSeconds) {
        totalTimeSpent += submission.timeSpentSeconds;
      }
    });

    // Completion is measured per unique student, capped at 100%
    const uniqueSubmitters = Object.keys(studentScores).length;
    const completionRate = recipientCount > 0
      ? Math.min(100, Math.round((uniqueSubmitters / recipientCount) * 100))
      : (totalSubmissions > 0 ? 100 : 0);

    const averageScore = totalSubmissions > 0 && totalMaxScore > 0
      ? Math.round((totalScore / totalMaxScore) * 100)
      : 0;

    const passRate = totalSubmissions > 0
      ? Math.round((passedCount / totalSubmissions) * 100)
      : 0;

    const averageTimeMinutes = totalSubmissions > 0
      ? Math.round((totalTimeSpent / totalSubmissions) / 60)
      : 0;

    // Find struggling students (score < 70%)
    const strugglingStudents = Object.entries(studentScores)
      .filter(([, score]) => score < 70)
      .map(([studentId]) => studentId);

    // Get top performers (score >= 90%)
    const topPerformers = Object.entries(studentScores)
      .filter(([, score]) => score >= 90)
      .map(([studentId]) => studentId);

    // Get submission summary for teacher
    const submissionSummaries = await queryByIndex(
      'SubmissionSummary',
      'byTeacherId',
      'teacherId',
      teacherId,
      100
    );

    // Filter for this assignment and get most common struggling words
    const assignmentSummaries = submissionSummaries.filter(
      (s: any) => s.assignmentId === assignmentId // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    const wordFrequency: { [key: string]: number } = {};
    assignmentSummaries.forEach((summary: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const unknownWords = summary.unknownWords as string[] || [];
      unknownWords.forEach((word: string) => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      });
    });

    const mostChallengingWords = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    return {
      assignmentId,
      totalSubmissions,
      completionRate,
      averageScore,
      passRate,
      averageTimeMinutes,
      strugglingStudentIds: strugglingStudents,
      topPerformerIds: topPerformers,
      mostChallengingWords,
      excellentCount: Object.values(studentScores).filter(s => s >= 90).length,
      goodCount: Object.values(studentScores).filter(s => s >= 70 && s < 90).length,
      needsImprovementCount: Object.values(studentScores).filter(s => s < 70).length,
    };

  } catch (error) {
    console.error('Error getting assignment analytics:', error);
    throw error;
  }
};
