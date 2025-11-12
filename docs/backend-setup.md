# WordNest Backend Setup (AWS Amplify + AppSync)

This guide walks you from a fresh AWS account to a live backend powering WordNest. Follow phases; you can stop after any phase and the app will still run in `mock` mode.

## Phase 0: Prerequisites

1. Install Node.js 20+ and npm.
2. Install the Amplify CLI globally (optional but recommended):
   ```bash
   npm install -g @aws-amplify/cli
   ```
3. Run `amplify configure` to create an IAM user and store credentials locally.
4. Clone the repo and copy `.env.example` to `.env.local`.

## Phase 1: Initialize Amplify Project

Inside the project root:
```bash
amplify init
```
Recommended answers:
* Environment name: `dev`
* Default editor: VS Code
* App type: `javascript`
* Framework: `react` (Next.js works fine — we only need build output paths) 
* Source dir: `src`
* Build command: `npm run build`
* Start command: `npm run dev`

This will create an `amplify/` directory to track backend resources.

## Phase 2: Add Authentication (Cognito)

```bash
amplify add auth
```
Select: `Default configuration with Social Provider` (or just default email/password if simpler). Enable Hosted UI for future OAuth flows.

After `amplify push`, fill these into `.env.local`:
```
NEXT_PUBLIC_COGNITO_USER_POOL_ID=
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=
NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID=  # if created
NEXT_PUBLIC_COGNITO_OAUTH_DOMAIN=      # <your-domain>.auth.<region>.amazoncognito.com
NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN=http://localhost:3000/
NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT=http://localhost:3000/
```

## Phase 3: Add GraphQL API (AppSync)

```bash
amplify add api
```
Choose: GraphQL, Authorization mode: Cognito User Pool (primary). Create new schema.

Paste the WordNest schema (simplify if needed first). You can start lean:
```graphql
type Query {
  getStudentDashboard(id: ID!): StudentDashboardPayload!
  getTeacherDashboard(id: ID!): TeacherDashboardPayload!
}

type Mutation {
  updateWordMastery(input: UpdateWordMasteryInput!): Word!
}
... # (rest from schema.graphql)
```

Run `amplify push` to generate resolvers. Amplify will create DynamoDB tables for types using @model automatically if you annotate them. For initial MVP you can:

1. Convert profiles to @model types or keep them as custom resolvers.
2. Start with a single DynamoDB table via a custom resolver (lookups by user id).

Populate `.env.local`:
```
NEXT_PUBLIC_APPSYNC_ENDPOINT=<https://your-id.appsync-api.<region>.amazonaws.com/graphql>
NEXT_PUBLIC_AWS_REGION=<region>
NEXT_PUBLIC_APPSYNC_AUTH_MODE=userPool
```
If using API key temporarily:
```
NEXT_PUBLIC_APPSYNC_AUTH_MODE=apiKey
NEXT_PUBLIC_APPSYNC_API_KEY=<key>
```

## Phase 4: Data Modeling & DynamoDB

Decide storage layout:
* Student profile table (partition key: `STUDENT#<id>`; sort keys for words/stories)
* Teacher profile table or unified table using composite PK/SK patterns:
  * PK: `USER#<id>` SK: `PROFILE`
  * PK: `USER#<id>` SK: `WORD#<wordId>`
  * PK: `CLASS#<teacherId>` SK: `CLASS#<classId>`
  * PK: `ASSIGNMENT#<teacherId>` SK: `ASSIGNMENT#<assignmentId>`

You can use Amplify’s @model for quick provisioning or write VTL/JS resolvers in `amplify/backend/api/<apiName>/resolvers/`.

Target resolvers MVP:
* `getStudentDashboard` — aggregate profile + words + recent stories
* `getTeacherDashboard` — aggregate teacher profile + classes + assignments + submissions
* `updateWordMastery` — mutate a Word item

## Phase 5: Connect Frontend to Live Data

1. Set `NEXT_PUBLIC_WORDNEST_API_MODE=amplify` in `.env.local`.
2. Restart dev server.
3. Portals should now fetch via AppSync (see `fetchStudentDashboard` / `fetchTeacherDashboard`).
4. Temporarily keep mock fallback by wrapping React Query `queryFn` in logic that catches 4xx/5xx and returns mock payload (optional).

## Phase 6: Implement Mutations

1. Add `updateWordMastery` call in a new file: `src/lib/api/mutations.ts`.
2. Create React Query mutation hooks (`useUpdateWordMastery`).
3. Wire student portal word buttons to call the mutation when mastery changes.
4. Optimistic update: update local `wordStatuses` then rollback on failure.

## Phase 7: Story Generation Backend

Two options:
* Lambda resolver calling Amazon Bedrock or OpenAI (via Secrets Manager).
* Direct GraphQL transformer with @function.

Flow:
1. Student triggers generation → mutation `generateStory` with word lists.
2. Lambda builds a prompt (reuse strings from `constants.ts`), calls provider, stores new story + new words, returns payload.
3. Frontend replaces local mock generator with real call.

## Phase 8: Authentication Flow Integration

Replace mock auth:
1. Use `aws-amplify/auth` to implement `signUp`, `signIn`, `confirmSignUp`, `forgotPassword`, `signOut`.
2. Store auth state in a React context or rely on Amplify’s built-in helpers.
3. Gate `/student` and `/teacher` routes with server-side or client guard redirecting if unauthenticated.

## Phase 9: Observability & Hardening

Add:
* CloudWatch metrics & logs for Lambda story generation
* AppSync logging (set minimal during dev, reduce in prod)
* WAF or rate limiting for story generation endpoint
* S3 bucket for story cache / audio assets (future)

## Phase 10: Deployment

Option A: Amplify Hosting
```bash
amplify hosting add
amplify publish
```
Option B: Vercel + AWS backend
* Deploy frontend to Vercel.
* Copy required NEXT_PUBLIC_* vars into Vercel env settings.
* Keep Amplify resources in AWS account; no change needed for GraphQL calls.

## Checklist Summary

| Phase | Outcome |
|-------|---------|
| 0 | Local dev ready |
| 1 | Amplify project initialized |
| 2 | Cognito auth provisioned |
| 3 | AppSync API live |
| 4 | Data persisted in DynamoDB |
| 5 | Frontend switched to live mode |
| 6 | Word mastery mutation implemented |
| 7 | Real story generation |
| 8 | Real auth flows integrated |
| 9 | Logging + security enhancements |
| 10 | Production deployment |

## Common Pitfalls

* Missing redirect URLs cause Hosted UI to fail silently → ensure both sign-in & sign-out URLs match exactly.
* API key auth left enabled in production for private data; prefer userPool only for protected resources.
* Oversized DynamoDB partitions (keep hot keys balanced; distribute with composite keys).
* Blocking UI while waiting for story generation — use React Query mutation + skeleton states.

## Next Additions (After MVP)

* Localization (i18n) for English/Hungarian toggling.
* Parent role & dashboards.
* Audio narration via Polly or Bedrock multimodal.
* Component + E2E tests (Playwright) against a seeded test environment.

---

Refer back to `README.md` and update environment variables as you add phases.
