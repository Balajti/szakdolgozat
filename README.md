# WordNest – Learn English Through Stories

WordNest helps Hungarian learners grow their English vocabulary through interactive, AI-assisted storytelling. Students explore highlighted stories with instant translations, while teachers curate assignments, track progress, and generate adaptive content.

![WordNest cover](./public/globe.svg)

## ✨ Features

- **Student portal** – Story reader with vocabulary tooltips, mastery tracking, progress metrics, and achievement highlights.
- **Teacher dashboard** – Class analytics, assignment management, submission summaries, and student leaderboards.
- **Authentication flows** – Registration, login, invite acceptance, and password reset screens built with React Hook Form + Zod.
- **Design system** – Tailored Tailwind CSS theme, Shadcn-inspired UI primitives, and motion-rich interactions.
- **Backend-ready** – Amplify/AppSync integration scaffolding with mock data fallbacks for local iteration.

## 🧱 Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS 4, custom theme tokens, KokonutUI particle button, Framer Motion animations.
- **Forms & State:** React Hook Form, Zod, React Query (TanStack) for data caching.
- **Icons & Charts:** Lucide Icons, Recharts.
- **Auth & Backend:** AWS Amplify (Cognito, AppSync, Lambda, DynamoDB) planned via configurable client wrappers.

## 📁 Project Structure

```
src/
	app/                # App Router routes (landing + portals + auth)
	components/
		layout/           # Shared layout shells (headers, portal shell)
		providers/        # App-wide providers (React Query, tooltips)
		ui/               # Reusable UI primitives
	lib/
		api/              # Amplify config + client facade
		graphql/          # GraphQL operations & schema draft
		hooks/            # React Query hooks
		mock-data.ts      # Mock fixtures for local development
		types.ts          # Shared TypeScript models
```

See [`docs/architecture.md`](./docs/architecture.md) for a deeper dive into the frontend modules, backend plan, and environment variables.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm (bundled with Node)

### Installation

```bash
npm install
```

### Runtime Environment

Create a `.env.local` file at the project root and provide the necessary variables. WordNest runs in mock mode by default, so a minimal configuration looks like:

```bash
NEXT_PUBLIC_WORDNEST_API_MODE=mock
```

To connect to AWS Amplify, supply the Cognito and AppSync identifiers described in [`docs/architecture.md`](./docs/architecture.md#environment-variables).

### Go live on AWS

Starting from a fresh AWS account? Follow the step‑by‑step backend guide:

- Backend setup: [`docs/backend-setup.md`](./docs/backend-setup.md)
- Env template: `.env.example` (copy to `.env.local` and fill values)

### Available Commands

```bash
npm run dev      # Start Next.js (Turbopack) on http://localhost:3000
npm run build    # Production build
npm run start    # Serve the production build
npm run lint     # ESLint (Next.js config)
npm run test     # Vitest unit test suite
```

## 🧪 Testing & Quality Gates

- **Unit tests:** Vitest exercises the Amplify client facade and configuration helpers. Run `npm run test` for a headless pass.
- **Linting:** `npm run lint` enforces TypeScript and Next.js best practices.
- **Future work:** add component/integration tests once real backend endpoints are in place and expand coverage to story generation flows.

## 👥 Demo Accounts

To explore WordNest without provisioning AWS resources, sign in with the built-in mock users (passwords are case-sensitive):

| Role    | Email                        | Password      |
|---------|------------------------------|---------------|
| Student | `student.demo@wordnest.hu`  | `Wordnest123!` |
| Teacher | `teacher.demo@wordnest.hu`  | `Wordnest123!` |

The login screen also lists these credentials for quick copy/paste.

## 🌐 Backend Integration

`src/lib/api` contains a lightweight client that:

- Reads Amplify configuration from `NEXT_PUBLIC_*` environment variables.
- Switches between real AppSync calls (`NEXT_PUBLIC_WORDNEST_API_MODE=amplify`) and mock data for local prototyping.
- Exposes React Query hooks (`useStudentDashboard`, `useTeacherDashboard`) consumed by the portals.

Provisioning instructions for Cognito pools, AppSync schema, and DynamoDB tables will live under `docs/` as the infrastructure matures.

## 🛣️ Roadmap & Next Steps

- Implement AWS Amplify backend resources and replace mock flows with live data.
- Expand testing (component tests, story generation edge cases).
- Add localization tooling for Hungarian/English UI copy.
- Explore audio narration and parent dashboards as stretch goals.

---

Built with ❤️ for language learners. Contributions, feedback, and pull requests are welcome!
