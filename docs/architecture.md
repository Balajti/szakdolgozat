# WordNest Architecture Overview

## Frontend

- **Framework:** Next.js 15 (App Router) with React 19 and TypeScript.
- **Styling & Design System:** Tailwind CSS 4, custom theme tokens in `src/app/globals.css`, and Shadcn-inspired UI primitives under `src/components/ui`.
- **State & Data Fetching:** React Query (`AppProviders`) provides global caching for API calls. Client-side forms use React Hook Form + Zod for validation.
- **Animations & Interactions:** Framer Motion (`motion`) animates hero sections and portal transitions; KokonutUI particle button adds flair to CTAs.
- **Portals:**
  - `src/app/student/page.tsx` implements a word-aware story reader with tooltip translations, vocabulary sidebar, and progress widgets.
  - `src/app/teacher/page.tsx` presents class analytics, assignment management, and submissions tracking.

## Backend Integration (Target)

WordNest connects to AWS resources through Amplify once provisioned:

- **Authentication:** Cognito User Pool (+ optional Identity Pool) handles student/teacher login flows.
- **API Layer:** AppSync GraphQL API exposes dashboard queries, story generation mutations, and word mastery updates. Schema draft lives in `src/lib/graphql/schema.graphql`.
- **Data Storage:** DynamoDB tables planned for users, classes, assignments, and vocabulary progress. Lambda resolvers orchestrate generation via OpenAI/Bedrock and dictionary APIs.
- **File Storage (Future):** S3 buckets for audio narrations or teacher uploads.

## Client API Layer

Located in `src/lib/api`:

- `config.ts` configures Amplify using `NEXT_PUBLIC_*` environment variables and guards against duplicate configuration.
- `client.ts` exposes `fetchStudentDashboard` and `fetchTeacherDashboard`, automatically falling back to mock data when `NEXT_PUBLIC_WORDNEST_API_MODE=mock`.
- `hooks/` wrap these calls with React Query for caching, revalidation, and status flags.
- `graphql/operations.ts` holds strongly-typed GraphQL documents consumed by Amplify's API client.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_WORDNEST_API_MODE` | `mock` (default) or `amplify` to switch data sources. |
| `NEXT_PUBLIC_APPSYNC_ENDPOINT` | AppSync GraphQL endpoint URL. |
| `NEXT_PUBLIC_APPSYNC_AUTH_MODE` | Auth strategy (`userPool`, `apiKey`, `iam`, etc.). |
| `NEXT_PUBLIC_APPSYNC_API_KEY` | Optional API key for AppSync when using `apiKey` mode. |
| `NEXT_PUBLIC_AWS_REGION` | AWS region (defaults to `eu-central-1`). |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito User Pool identifier. |
| `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID` | Cognito web client ID. |
| `NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID` | Identity Pool ID for federated identities. |
| `NEXT_PUBLIC_COGNITO_OAUTH_DOMAIN` | Hosted Cognito domain for OAuth flows. |
| `NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN` | Allowed sign-in redirect URL. |
| `NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT` | Allowed sign-out redirect URL. |

## Testing Strategy

- Vitest powers unit tests. Execute `npm run test` for a full run.
- Linting enforced via `npm run lint` (ESLint 9 + Next.js rules).
- Future work: add component tests (e.g., Playwright) and integration tests once Amplify backend is live.

## Deployment Notes

- Development uses `npm run dev` with Turbopack for faster HMR.
- Production build via `npm run build` (Turbopack) followed by `npm run start`.
- AWS Amplify Hosting or Vercel can serve the Next.js frontend; ensure environment variables are mirrored in the hosting platform.
