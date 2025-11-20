import { Schema } from '../../data/resource';
import { getDBClient } from '../shared/dynamodb-client';

export const handler: Schema['cleanupOldStories']['functionHandler'] = async (event) => {
  const { studentId } = event.arguments;
  
  try {
    const dbClient = getDBClient();
    
    // Get all stories for this student
    const storiesResult = await dbClient.query('Story', {
      indexName: 'byStudentId',
      keyConditionExpression: '#studentId = :studentId',
      expressionAttributeNames: { '#studentId': 'studentId' },
      expressionAttributeValues: { ':studentId': studentId },
    });
    
    const stories = storiesResult.items;
    
    // Sort by creation date (newest first)
    stories.sort((a, b) => {
      const dateA = new Date((a.createdAt as string) || new Date(0).toISOString()).getTime();
      const dateB = new Date((b.createdAt as string) || new Date(0).toISOString()).getTime();
      return dateB - dateA;
    });
    
    // Keep only the last 30 stories
    const storiesToDelete = stories.slice(30);
    
    if (storiesToDelete.length === 0) {
      return {
        deletedCount: 0,
      };
    }
    
    // Delete old stories and their quiz questions
    for (const story of storiesToDelete) {
      // Delete the story
      await dbClient.delete('Story', story.id as string);
      
      // Delete associated quiz questions
      const quizQuestionsResult = await dbClient.query('QuizQuestion', {
        indexName: 'byStoryId',
        keyConditionExpression: '#storyId = :storyId',
        expressionAttributeNames: { '#storyId': 'storyId' },
        expressionAttributeValues: { ':storyId': story.id },
      });
      
      for (const question of quizQuestionsResult.items) {
        await dbClient.delete('QuizQuestion', question.id as string);
      }
    }
    
    return {
      deletedCount: storiesToDelete.length,
    };
  } catch (error) {
    console.error('Error cleaning up old stories:', error);
    throw new Error('Failed to cleanup old stories');
  }
};
