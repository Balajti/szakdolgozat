export const updateWordMasteryMutation = /* GraphQL */ `
  mutation UpdateWordMastery($input: UpdateWordMasteryInput!) {
    updateWordMastery(input: $input) {
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
  mutation GenerateStory($input: StoryGenerationInput!) {
    generateStory(input: $input) {
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
