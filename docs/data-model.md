# WordNest Data Model (Proposed DynamoDB Layout)

This document captures what the app needs to persist once we move off mock data.

## Entities

1. StudentProfile
   - id (PK component)
   - name, email, birthday, level, streak, vocabularyCount
   - achievements (inline or separate items)

2. Word
   - wordId
   - studentId (owner)
   - text, translation, exampleSentence, mastery, lastReviewedAt

3. Story
   - storyId
   - studentId (for personalized or placement stories) OR teacherId (for assignment template)
   - title, content, level, createdAt, unknownWordIds

4. TeacherProfile
   - teacherId
   - name, email, school

5. ClassSummary
   - classId
   - teacherId
   - name, studentCount, averageLevel, completionRate, mostChallengingWord

6. Assignment
   - assignmentId
   - teacherId
   - title, dueDate, level, status, requiredWords[], excludedWords[]

7. SubmissionSummary
   - assignmentId
   - studentId
   - submittedAt, score, unknownWords[]

## Single Table Pattern (Recommended)

Partition Key (PK) and Sort Key (SK) composite patterns:

| Item Type           | PK                        | SK                               | Notes |
|---------------------|---------------------------|----------------------------------|-------|
| StudentProfile      | `STUDENT#<studentId>`     | `PROFILE`                        | Core profile |
| Word                | `STUDENT#<studentId>`     | `WORD#<wordId>`                  | Query all words by student |
| Story (student)     | `STUDENT#<studentId>`     | `STORY#<storyId>`                | Personalized/placement stories |
| TeacherProfile      | `TEACHER#<teacherId>`     | `PROFILE`                        | Teacher core profile |
| ClassSummary        | `TEACHER#<teacherId>`     | `CLASS#<classId>`                | Classes list |
| Assignment          | `TEACHER#<teacherId>`     | `ASSIGN#<assignmentId>`          | Teacher's assignments |
| Story (teacher)     | `TEACHER#<teacherId>`     | `STORY#<storyId>`                | Assignment template story |
| SubmissionSummary   | `ASSIGN#<assignmentId>`   | `SUBMISSION#<studentId>`         | Query submissions by assignment |

## Secondary Indexes

1. GSI1 (Student progress aggregation)
   - PK: `STUDENT#<studentId>`
   - SK: begins_with `WORD#` or `STORY#`
   - Purpose: derive vocabularyCount, streak, or recent story list quickly.

2. GSI2 (Assignments by due date)
   - PK: `ASSIGNMENT_DUE` (static)
   - SK: `<dueDate>#<assignmentId>`
   - Purpose: list upcoming deadlines across all classes.

3. GSI3 (Word difficulty leaderboard)
   - PK: `WORD#<text>`
   - SK: `<studentId>#<mastery>`
   - Purpose: detect most challenging words per cohort.

## Mutations Mapping

| Frontend Action              | GraphQL Mutation        | Underlying Storage Change |
|------------------------------|-------------------------|---------------------------|
| Update word mastery          | updateWordMastery       | Update WORD item (mastery + lastReviewedAt) |
| Generate story (student)     | generateStory           | Create STORY item + optional new WORD items |
| Generate story (teacher)     | generateStory           | Create STORY item under teacher PK |
| Create assignment            | createAssignment        | Write ASSIGN item; link required/excluded words |
| Submit assignment (future)   | submitAssignment (TBD)  | Write SUBMISSION item |

## Derivations

Vocabulary count: count of WORD items (can be cached) where mastery != unknown OR simply total.
Streak: lastReviewedAt timestamps sequence — compute daily boundary events (optionally store STREAK item).
Completion rate (class): (# submissions with score) / (# assignments sent * students) — precompute nightly with Lambda.

## Story Content Storage

Option A: Inline JSON (current schema uses `AWSJSON`).
Option B: S3 object reference for longer stories (store metadata in DynamoDB, body in S3). Keep current inline approach for MVP.

## Next Steps

1. Add Amplify GraphQL @model directives or custom resolvers for each item type.
2. Implement Lambda function for `generateStory` (Bedrock/OpenAI integration) and map it with @function.
3. Add unit tests exercising resolvers locally with Amplify mock.
