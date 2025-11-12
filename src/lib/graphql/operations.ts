export const getStudentDashboardQuery = /* GraphQL */ `
  query GetStudentDashboard($id: ID!) {
    getStudentDashboard(id: $id) {
      profile {
        id
        name
        email
        birthday
        avatarUrl
        level
        streak
        vocabularyCount
        achievements {
          id
          title
          description
          icon
          achievedAt
        }
        words {
          id
          text
          translation
          exampleSentence
          mastery
          lastReviewedAt
        }
        stories {
          id
          title
          content
          createdAt
          level
          unknownWordIds
          highlightedWords {
            word
            offset
            length
          }
        }
      }
    }
  }
`;

export const getTeacherDashboardQuery = /* GraphQL */ `
  query GetTeacherDashboard($id: ID!) {
    getTeacherDashboard(id: $id) {
      profile {
        id
        name
        email
        school
        classes {
          id
          name
          studentCount
          averageLevel
          completionRate
          mostChallengingWord
        }
      }
      assignments {
        id
        title
        dueDate
        level
        status
        requiredWords
        excludedWords
      }
      submissions {
        studentId
        studentName
        submittedAt
        score
        unknownWords
      }
      classes {
        id
        name
        studentCount
        averageLevel
        completionRate
        mostChallengingWord
      }
    }
  }
`;
