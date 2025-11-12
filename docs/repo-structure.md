# Repository structure (committed files)

This tree shows what we commit to Git by default. See `.gitignore` for excluded build artifacts, local env files, and sandbox output.

```
.
├─ README.md
├─ .gitignore
├─ .env.example
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ eslint.config.mjs
├─ next.config.ts
├─ postcss.config.mjs
├─ vitest.config.ts
├─ components.json
├─ public/
│  ├─ globe.svg
│  ├─ vercel.svg
│  ├─ next.svg
│  ├─ file.svg
│  └─ window.svg
├─ docs/
│  ├─ architecture.md
│  ├─ backend-setup.md
│  ├─ data-model.md
│  └─ repo-structure.md  ← this file
├─ amplify/                  # Amplify Gen 2 backend (committed)
│  ├─ backend.ts
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ auth/
│  │  └─ resource.ts
│  └─ data/
│     └─ resource.ts
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ globals.css
│  │  ├─ page.tsx
│  │  ├─ favicon.ico
│  │  ├─ auth/
│  │  │  ├─ layout.tsx
│  │  │  ├─ login/page.tsx
│  │  │  ├─ register/page.tsx
│  │  │  ├─ reset/page.tsx
│  │  │  └─ invite/page.tsx
│  │  ├─ student/page.tsx
│  │  └─ teacher/page.tsx
│  ├─ components/
│  │  ├─ common/
│  │  │  └─ logo.tsx
│  │  ├─ kokonutui/
│  │  │  └─ particle-button.tsx
│  │  ├─ landing/
│  │  │  ├─ feature-card.tsx
│  │  │  └─ story-preview.tsx
│  │  ├─ layout/
│  │  │  ├─ portal-shell.tsx
│  │  │  ├─ site-footer.tsx
│  │  │  └─ site-header.tsx
│  │  ├─ providers/
│  │  │  └─ app-providers.tsx
│  │  └─ ui/ (shadcn-inspired primitives)
│  │     ├─ alert.tsx
│  │     ├─ avatar.tsx
│  │     ├─ badge.tsx
│  │     ├─ button.tsx
│  │     ├─ card.tsx
│  │     ├─ checkbox.tsx
│  │     ├─ dialog.tsx
│  │     ├─ dropdown-menu.tsx
│  │     ├─ form.tsx
│  │     ├─ input.tsx
│  │     ├─ label.tsx
│  │     ├─ metric-card.tsx
│  │     ├─ popover.tsx
│  │     ├─ progress.tsx
│  │     ├─ scroll-area.tsx
│  │     ├─ select.tsx
│  │     ├─ separator.tsx
│  │     ├─ switch.tsx
│  │     ├─ table.tsx
│  │     ├─ tabs.tsx
│  │     ├─ textarea.tsx
│  │     └─ tooltip.tsx
│  └─ lib/
│     ├─ api/
│     │  ├─ client.ts
│     │  ├─ client.test.ts
│     │  ├─ config.ts
│     │  ├─ config.test.ts
│     │  └─ mutations.ts
│     ├─ graphql/
│     │  ├─ operations.ts
│     │  ├─ mutations.ts
│     │  └─ schema.graphql
│     ├─ hooks/
│     │  ├─ use-student-dashboard.ts
│     │  ├─ use-teacher-dashboard.ts
│     │  └─ use-mutations.ts
│     ├─ auth-client.ts
│     ├─ constants.ts
│     ├─ mock-data.ts
│     ├─ types.ts
│     └─ utils.ts
└─ (ignored by .gitignore)
   ├─ node_modules/
   ├─ .next/
   ├─ out/
   ├─ .amplify/
   ├─ amplify/.tmp
   ├─ amplify/dist
   ├─ cdk.out
   ├─ amplify_outputs.json
   ├─ .env.local
   └─ *.tsbuildinfo
```

Notes:
- `.env.example` is committed; `.env.local` is ignored.
- `amplify/` backend source is committed, but its build artifacts (`amplify/.tmp`, `amplify/dist`) are ignored.
- `amplify_outputs.json` from local sandbox is ignored by default. Commit it only if you intend to share local endpoints with the team.
