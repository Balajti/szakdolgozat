export const updateWordMasteryMutation = /* GraphQL */ `
  mutation UpdateWordMastery($studentId: ID!, $wordId: ID!, $mastery: WordMastery!) {
    updateWordMastery(studentId: $studentId, wordId: $wordId, mastery: $mastery) {
      id
      text
      translation
      exampleSentence
      mastery
      lastReviewedAt
    }
  }
`;

export const generateStoryMutation = /* GraphQL */ `
  mutation GenerateStory(
    $level: String!,
    $age: Int!,
    $knownWords: [String!]!,
    $unknownWords: [String!]!,
    $requiredWords: [String!],
    $excludedWords: [String!],
    $mode: StoryGenerationMode!
  ) {
    generateStory(
      level: $level,
      age: $age,
      knownWords: $knownWords,
      unknownWords: $unknownWords,
      requiredWords: $requiredWords,
      excludedWords: $excludedWords,
      mode: $mode
    ) {
      story {
        id
        title
        content
        createdAt
        level
        unknownWordIds
      }
      newWords {
        id
        text
        translation
        exampleSentence
        mastery
        lastReviewedAt
      }
    }
  }
`;
