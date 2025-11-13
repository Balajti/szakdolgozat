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
        createdAt
        updatedAt
        achievements {
          id
          studentId
          title
          description
          icon
          achievedAt
          createdAt
          updatedAt
        }
        words {
          id
          studentId
          text
          translation
          exampleSentence
          mastery
          lastReviewedAt
          createdAt
          updatedAt
        }
        stories {
          id
          studentId
          teacherId
          title
          content
          level
          createdAt
          updatedAt
          mode
          unknownWordIds
          highlightedWords {
            word
            offset
            length
          }
        }
      }
      recommendations {
        id
        studentId
        teacherId
        title
        content
        level
        createdAt
        updatedAt
        mode
        unknownWordIds
        highlightedWords {
          word
          offset
          length
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
        createdAt
        updatedAt
      }
      assignments {
        id
        teacherId
        title
        dueDate
        level
        status
        requiredWords
        excludedWords
        createdAt
        updatedAt
      }
      submissions {
        id
        assignmentId
        teacherId
        studentId
        studentName
        submittedAt
        score
        unknownWords
        createdAt
        updatedAt
      }
      classes {
        id
        teacherId
        name
        studentCount
        averageLevel
        completionRate
        mostChallengingWord
        createdAt
        updatedAt
      }
    }
  }
`;
