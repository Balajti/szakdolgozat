import { Schema } from '../../data/resource';
import { getDBClient } from '../shared/dynamodb-client';

export const handler: Schema['trackVocabularyProgress']['functionHandler'] = async (event) => {
  const { studentId } = event.arguments;
  
  try {
    const dbClient = getDBClient();
    
    // Get all words for this student
    const wordsResult = await dbClient.query('Word', {
      indexName: 'byStudentId',
      keyConditionExpression: '#studentId = :studentId',
      expressionAttributeNames: { '#studentId': 'studentId' },
      expressionAttributeValues: { ':studentId': studentId },
    });
    
    const words = wordsResult.items;
    const knownWords = words.filter(w => w.masteryLevel === 'known').length;
    const learningWords = words.filter(w => w.masteryLevel === 'learning').length;
    const unknownWords = words.filter(w => w.masteryLevel === 'unknown').length;
    
    // Get yesterday's progress to calculate new words
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Get yesterday's record
    const yesterdayResult = await dbClient.query('VocabularyProgress', {
      indexName: 'byStudentId',
      keyConditionExpression: '#studentId = :studentId',
      filterExpression: '#date = :date',
      expressionAttributeNames: {
        '#studentId': 'studentId',
        '#date': 'date',
      },
      expressionAttributeValues: {
        ':studentId': studentId,
        ':date': yesterdayStr,
      },
    });
    
    const yesterdayKnownWords = (yesterdayResult.items[0]?.knownWords as number) || 0;
    const newWordsToday = Math.max(0, knownWords - yesterdayKnownWords);
    
    // Create today's progress record
    const progressRecord = {
      id: `${studentId}-${todayStr}`,
      studentId,
      date: todayStr,
      knownWords,
      learningWords,
      unknownWords,
      newWordsToday,
      createdAt: new Date().toISOString(),
    };
    
    await dbClient.put('VocabularyProgress', progressRecord);
    
    return {
      date: todayStr,
      knownWords,
      learningWords,
      unknownWords,
      newWordsToday,
    };
  } catch (error) {
    console.error('Error tracking vocabulary progress:', error);
    throw new Error('Failed to track vocabulary progress');
  }
};
