import { Schema } from '../../data/resource';
import { getDBClient } from '../shared/dynamodb-client';

// Badge definitions with unlock criteria
const BADGES = [
  { type: '7-day-streak', title: '7 napos sorozat', description: 'Tanulj 7 napon át egymás után', icon: '🔥', target: 7 },
  { type: '30-day-streak', title: '30 napos sorozat', description: 'Tanulj 30 napon át egymás után', icon: '🌟', target: 30 },
  { type: '100-words', title: '100 elsajátított szó', description: 'Sajátíts el 100 szót', icon: '📚', target: 100 },
  { type: '500-words', title: '500 elsajátított szó', description: 'Sajátíts el 500 szót', icon: '🎓', target: 500 },
  { type: '1000-words', title: '1000 elsajátított szó', description: 'Sajátíts el 1000 szót', icon: '🏆', target: 1000 },
  { type: '10-stories', title: '10 elolvasott történet', description: 'Olvass el 10 történetet', icon: '📖', target: 10 },
  { type: '50-stories', title: '50 elolvasott történet', description: 'Olvass el 50 történetet', icon: '📚', target: 50 },
  { type: '100-stories', title: '100 elolvasott történet', description: 'Olvass el 100 történetet', icon: '🎯', target: 100 },
  { type: 'first-assignment', title: 'Első feladat', description: 'Teljesítsd az első feladatodat', icon: '✅', target: 1 },
  { type: '10-assignments', title: '10 feladat', description: 'Teljesíts 10 feladatot', icon: '💯', target: 10 },
  { type: '50-assignments', title: '50 feladat', description: 'Teljesíts 50 feladatot', icon: '🌟', target: 50 },
  { type: 'perfect-score', title: 'Hibátlan megoldás', description: 'Érj el 100%-ot egy feladatban', icon: '🏅', target: 1 },
  { type: '10-perfect-scores', title: '10 hibátlan megoldás', description: 'Érj el 100%-ot 10 feladatban', icon: '💎', target: 10 },
  { type: 'early-bird', title: 'Korán kelő', description: 'Teljesíts egy feladatot a határidő előtt', icon: '🌅', target: 1 },
  { type: 'quiz-master', title: 'Kvízmester', description: 'Teljesíts 10 kvízt legalább 80%-os eredménnyel', icon: '🧠', target: 10 },
];

export const handler: Schema['checkBadges']['functionHandler'] = async (event) => {
  const { studentId } = event.arguments;
  
  try {
    const dbClient = getDBClient();
    
    // Get student profile
    const student = await dbClient.get('StudentProfile', studentId);
    if (!student) {
      throw new Error('Student not found');
    }
    
    // Get all current badges for this student
    const existingBadgesResult = await dbClient.query('Badge', {
      indexName: 'byStudentId',
      keyConditionExpression: '#studentId = :studentId',
      expressionAttributeNames: { '#studentId': 'studentId' },
      expressionAttributeValues: { ':studentId': studentId },
    });
    const existingBadges = existingBadgesResult.items;
    const unlockedBadgeTypes = new Set(
      existingBadges.filter(b => b.isUnlocked).map(b => b.type)
    );
    
    // Get student stats
    const wordsResult = await dbClient.query('Word', {
      indexName: 'byStudentId',
      keyConditionExpression: '#studentId = :studentId',
      expressionAttributeNames: { '#studentId': 'studentId' },
      expressionAttributeValues: { ':studentId': studentId },
    });
    const masteredWordsCount = wordsResult.items.filter(w => w.mastery === 'known').length;

    // Prefer the explicit "finished reading" counter; fall back to the number
    // of generated stories for profiles created before it existed.
    let storiesCount = Number(student.totalStoriesRead ?? 0);
    if (!storiesCount) {
      const storiesResult = await dbClient.query('Story', {
        indexName: 'byStudentId',
        keyConditionExpression: '#studentId = :studentId',
        expressionAttributeNames: { '#studentId': 'studentId' },
        expressionAttributeValues: { ':studentId': studentId },
      });
      storiesCount = storiesResult.items.filter(s => Number(s.readCount ?? 0) > 0).length;
    }
    
    const submissionsResult = await dbClient.query('AssignmentSubmission', {
      indexName: 'byStudentId',
      keyConditionExpression: '#studentId = :studentId',
      expressionAttributeNames: { '#studentId': 'studentId' },
      expressionAttributeValues: { ':studentId': studentId },
    });
    const submissions = submissionsResult.items;
    const assignmentsCount = submissions.length;
    const perfectScoresCount = submissions.filter(s => 
      s.score === s.maxScore && (s.maxScore as number) > 0
    ).length;
    
    const currentStreak = (student.streak as number) || (student.currentStreak as number) || 0;
    
    // Check each badge
    const newBadges = [];
    for (const badgeDef of BADGES) {
      if (unlockedBadgeTypes.has(badgeDef.type)) {
        continue; // Already unlocked
      }
      
      let progress = 0;
      let shouldUnlock = false;
      
      // Calculate progress based on badge type
      if (badgeDef.type === '7-day-streak' || badgeDef.type === '30-day-streak') {
        progress = currentStreak;
        shouldUnlock = currentStreak >= badgeDef.target;
      } else if (badgeDef.type.includes('words')) {
        progress = masteredWordsCount;
        shouldUnlock = masteredWordsCount >= badgeDef.target;
      } else if (badgeDef.type.includes('stories')) {
        progress = storiesCount;
        shouldUnlock = storiesCount >= badgeDef.target;
      } else if (badgeDef.type.includes('assignments')) {
        progress = assignmentsCount;
        shouldUnlock = assignmentsCount >= badgeDef.target;
      } else if (badgeDef.type === 'perfect-score' || badgeDef.type === '10-perfect-scores') {
        progress = perfectScoresCount;
        shouldUnlock = perfectScoresCount >= badgeDef.target;
      } else if (badgeDef.type === 'early-bird') {
        // Check if any submission was before due date
        // This would require assignment due date comparison, skipping for now
        progress = 0;
        shouldUnlock = false;
      } else if (badgeDef.type === 'quiz-master') {
        // This would require quiz score tracking, skipping for now
        progress = 0;
        shouldUnlock = false;
      }
      
      // Create or update badge record
      const badge = {
        id: `${studentId}-${badgeDef.type}`,
        studentId,
        type: badgeDef.type,
        title: badgeDef.title,
        description: badgeDef.description,
        icon: badgeDef.icon,
        progress,
        target: badgeDef.target,
        isUnlocked: shouldUnlock,
        achievedAt: shouldUnlock ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
      };
      
      await dbClient.put('Badge', badge);
      
      if (shouldUnlock) {
        newBadges.push(badge);
      }
    }
    
    // Get all badges for return
    const allBadgesResult = await dbClient.query('Badge', {
      indexName: 'byStudentId',
      keyConditionExpression: '#studentId = :studentId',
      expressionAttributeNames: { '#studentId': 'studentId' },
      expressionAttributeValues: { ':studentId': studentId },
    });
    
    return {
      newBadges: JSON.stringify(newBadges),
      allBadges: JSON.stringify(allBadgesResult.items),
    };
  } catch (error) {
    console.error('Error checking badges:', error);
    throw new Error('Failed to check badges');
  }
};
