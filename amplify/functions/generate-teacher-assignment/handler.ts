import type { Schema } from '../../data/resource';
import { DynamoDBDataClient } from '../shared/dynamodb-client';

type GenerateTeacherAssignmentHandler = Schema['generateTeacherAssignment']['functionHandler'];

const dbClient = new DynamoDBDataClient();

interface BlankPosition {
  position: number;
  word: string;
  originalWord: string;
  index: number;
}

interface AssignmentData {
  [key: string]: unknown;
  teacherId: string;
  title: string;
  dueDate: string;
  level: string;
  status: string;
  assignmentType: string;
  requiredWords?: string[];
  excludedWords?: string[];
  createdAt: string;
  updatedAt: string;
  storyContent?: string | null;
  blankPositions?: BlankPosition[];
  matchingWords?: string[];
}

/**
 * Generates different types of teacher assignments
 * Types:
 * - basic: Regular story with all words visible
 * - fill_blanks: Story with teacher-selected words removed (student fills them in)
 * - word_matching: Extract 5-20 target words for matching exercise
 * - custom_words: Story that must include specific teacher-provided words
 */
export const handler: GenerateTeacherAssignmentHandler = async (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const {
    teacherId,
    title,
    assignmentType,
    level,
    dueDate,
    storyId,
    wordsToRemove,
    numberOfWords,
    customWords
  } = event.arguments;

  try {
    // Validate assignment type
    const validTypes = ['basic', 'fill_blanks', 'word_matching', 'custom_words'];
    if (!validTypes.includes(assignmentType)) {
      throw new Error(`Invalid assignment type: ${assignmentType}`);
    }

    const assignment: AssignmentData = {
      teacherId,
      title,
      dueDate,
      level,
      status: 'draft',
      assignmentType,
      requiredWords: [],
      excludedWords: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Handle different assignment types
    switch (assignmentType) {
      case 'basic':
        // Simple story assignment - just reference the story
        if (!storyId) {
          throw new Error('storyId is required for basic assignment type');
        }
        
        const basicStory = await dbClient.get('Story', storyId);
        if (!basicStory) {
          throw new Error(`Story not found: ${storyId}`);
        }
        
        assignment.storyContent = basicStory.content as string;
        assignment.requiredWords = [];
        break;

      case 'fill_blanks':
        // Story with words removed - student must fill in the blanks
        if (!storyId || !wordsToRemove || wordsToRemove.length === 0) {
          throw new Error('storyId and wordsToRemove are required for fill_blanks type');
        }
        
        const fillBlanksStory = await dbClient.get('Story', storyId);
        if (!fillBlanksStory) {
          throw new Error(`Story not found: ${storyId}`);
        }
        
        // Generate story with blanks and track positions
        const { modifiedContent, blankPositions } = createFillBlanksStory(
          fillBlanksStory.content as string,
          wordsToRemove
        );
        
        assignment.storyContent = modifiedContent;
        assignment.blankPositions = blankPositions;
        assignment.requiredWords = wordsToRemove;
        
        // Update the story record with blank positions
        await dbClient.update('Story', storyId, {
          blankPositions: blankPositions
        });
        break;

      case 'word_matching':
        // Extract words for matching exercise
        if (!storyId) {
          throw new Error('storyId is required for word_matching type');
        }
        
        const matchingStory = await dbClient.get('Story', storyId);
        if (!matchingStory) {
          throw new Error(`Story not found: ${storyId}`);
        }
        
        // Extract highlighted or target words
        const wordsToMatch = extractWordsForMatching(
          matchingStory.content as string,
          matchingStory.highlightedWords,
          numberOfWords || 10
        );
        
        if (wordsToMatch.length < 5) {
          throw new Error('Not enough words found for matching exercise (minimum 5 required)');
        }
        
        assignment.storyContent = matchingStory.content as string;
        assignment.matchingWords = wordsToMatch;
        assignment.requiredWords = wordsToMatch;
        break;

      case 'custom_words':
        // Story must include specific teacher-provided words
        if (!customWords || customWords.length === 0) {
          throw new Error('customWords are required for custom_words type');
        }
        
        if (customWords.length < 5 || customWords.length > 20) {
          throw new Error('customWords must contain between 5 and 20 words');
        }
        
        // This will be used by the generate-story function to create a story
        // that includes these specific words
        assignment.requiredWords = customWords;
        assignment.storyContent = null; // Story will be generated separately
        break;

      default:
        throw new Error(`Unsupported assignment type: ${assignmentType}`);
    }

    // Save assignment to DynamoDB
    const savedAssignment = await dbClient.put('Assignment', assignment);

    return {
      id: savedAssignment.id as string,
      teacherId: savedAssignment.teacherId as string,
      title: savedAssignment.title as string,
      assignmentType: savedAssignment.assignmentType as string,
      dueDate: savedAssignment.dueDate as string,
      level: savedAssignment.level as string,
      status: savedAssignment.status as string,
      storyContent: savedAssignment.storyContent as string | null | undefined,
      requiredWords: savedAssignment.requiredWords as string[] | undefined,
      blankPositions: savedAssignment.blankPositions as BlankPosition[] | undefined,
      matchingWords: savedAssignment.matchingWords as string[] | undefined,
      createdAt: savedAssignment.createdAt as string
    };

  } catch (error) {
    console.error('Error generating teacher assignment:', error);
    throw error;
  }
};

/**
 * Creates a fill-in-the-blanks version of a story
 * Replaces specified words with _____ and tracks their positions
 */
function createFillBlanksStory(
  content: string,
  wordsToRemove: string[]
): { modifiedContent: string; blankPositions: BlankPosition[] } {
  const blankPositions: BlankPosition[] = [];
  let modifiedContent = content;
  let offset = 0;

  // Create case-insensitive word set for matching
  const wordsToRemoveSet = new Set(wordsToRemove.map(w => w.toLowerCase()));

  // Split content into words while preserving spaces and punctuation
  const words = content.split(/(\s+)/);
  let position = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Skip whitespace
    if (/^\s+$/.test(word)) {
      position += word.length;
      continue;
    }

    // Clean word for comparison (remove punctuation)
    const cleanWord = word.replace(/[.,!?;:"""''()]/g, '').toLowerCase();
    
    if (wordsToRemoveSet.has(cleanWord)) {
      // Track the position and original word
      blankPositions.push({
        position: position,
        word: cleanWord,
        originalWord: word,
        index: blankPositions.length
      });

      // Replace word with blank
      const blank = '_____';
      const before = modifiedContent.substring(0, position + offset);
      const after = modifiedContent.substring(position + offset + word.length);
      modifiedContent = before + blank + after;
      
      offset += blank.length - word.length;
    }
    
    position += word.length;
  }

  return { modifiedContent, blankPositions };
}

/**
 * Extracts words for matching exercise from story
 * Prioritizes highlighted words, falls back to unique interesting words
 */
function extractWordsForMatching(
  content: string,
  highlightedWords: unknown,
  numberOfWords: number
): string[] {
  const words: string[] = [];
  
  // Try to use highlighted words first
  if (highlightedWords && Array.isArray(highlightedWords)) {
    for (const hw of highlightedWords) {
      if (hw.word && !words.includes(hw.word.toLowerCase())) {
        words.push(hw.word.toLowerCase());
      }
    }
  }

  // If not enough words, extract from content
  if (words.length < numberOfWords) {
    // Extract all words from content
    const contentWords = content
      .toLowerCase()
      .replace(/[.,!?;:"""''()]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3); // Only words longer than 3 characters

    // Get unique words
    const uniqueWords = Array.from(new Set(contentWords));
    
    // Add words until we reach the target number
    for (const word of uniqueWords) {
      if (!words.includes(word)) {
        words.push(word);
      }
      if (words.length >= numberOfWords) {
        break;
      }
    }
  }

  // Cap at requested number of words (or 20 max)
  const maxWords = Math.min(numberOfWords, 20);
  return words.slice(0, maxWords);
}
