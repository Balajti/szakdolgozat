# Deploying WordNest to a fresh AWS account

This is the exact, start-to-finish checklist for standing up WordNest on a brand-new AWS
account with Amplify Gen 2. The repo is fully portable: nothing in it references a
specific AWS account or app ID anymore, so the whole process is
**connect repo → set 4 variables → deploy**.

---

## 0. Before you start

You need:

- A new AWS account (root email + credit card, free tier is enough).
- Your GitHub repository (`Balajti/szakdolgozat`).
- A Google Gemini API key (https://aistudio.google.com/apikey — free tier works).
- An email address you control for sending assignment emails (e.g. your Gmail).

> **Region tip:** pick one region and stay in it for everything below.
> `eu-central-1` (Frankfurt) is the natural choice from Hungary.

---

## 1. Create the Amplify app (~10 minutes)

1. Sign in to the AWS console with your new account.
2. In the region selector (top right), choose **Europe (Frankfurt) eu-central-1**.
3. Go to **AWS Amplify** → **Create new app** (Host web app).
4. Choose **GitHub**, authorize AWS Amplify for your GitHub account, and select the
   `szakdolgozat` repository and the `main` branch.
5. Amplify auto-detects the Next.js app and the `amplify.yml` build spec —
   **don't edit the build settings**, the repo's `amplify.yml` is used automatically
   and works on any account (it uses the `$AWS_APP_ID` / `$AWS_BRANCH` variables).
6. Under **Advanced settings**, you can already add the environment variables from
   step 2 — or add them after the first deploy and redeploy.
7. Click **Save and deploy**. The first build takes ~10–15 minutes
   (it deploys the whole backend: Cognito, AppSync, DynamoDB, Lambdas, S3).

## 2. Set the app's variables (required)

In the Amplify console, open your app, then:

### App settings → Secrets → *Manage secrets* → Add secret

| Secret | Value |
|---|---|
| `GEMINI_API_KEY` | your Gemini API key |

This is what the backend Lambdas (story generation, quiz, translation,
difficulty adjuster) use.

### App settings → Environment variables → Manage variables

| Variable | Value | Why |
|---|---|---|
| `GEMINI_API_KEY` | your Gemini API key (same value again) | the Next.js `/api/translate` route runs on the hosting side, not in a Lambda |
| `APP_URL` | your app URL, e.g. `https://main.XXXXXXXX.amplifyapp.com` (copy it from the Amplify app overview after the first deploy) | assignment links in notification emails |
| `FROM_EMAIL` | the email address verified in step 3 | sender address for assignment emails |

> After changing secrets/variables, hit **Redeploy this version** on the `main`
> branch so the backend picks them up.

## 3. Verify the email sender in SES (for assignment emails)

New AWS accounts start in the **SES sandbox**: you can only send *from* verified
identities and *to* verified addresses.

1. Go to **Amazon SES** (same region!) → **Identities** → **Create identity**.
2. Choose **Email address**, enter the address you'll send from
   (the one you put in `FROM_EMAIL`), and confirm the verification email you receive.
3. While in the sandbox, also verify the *recipient* addresses you'll demo with
   (your test student emails) the same way.
4. (Optional, for real use) Request production access: SES → **Account dashboard** →
   **Request production access** — fill in the short form; approval usually takes a day.

If you skip this step the app still works — students get in-app data and the
public assignment link still functions; only the emails are skipped.

## 4. Smoke test

1. Open the app URL → register a **teacher** account (confirm the emailed code).
2. Register a **student** account in a private browser window.
3. Teacher: create a class, generate a "Hiányzó szavas történet" assignment with a
   theme + a few words, send it to the class.
4. Student: open the assignment link, drag the words, submit.
5. Teacher: check **Elemzések** for the submission.

## 5. Local development against the new account (optional)

```bash
npm install
npx ampx sandbox                      # deploys a personal sandbox backend, writes amplify_outputs.json
npx ampx sandbox secret set GEMINI_API_KEY   # paste your key when prompted
npm run dev
```

Or skip AWS entirely with mock data: set `NEXT_PUBLIC_WORDNEST_API_MODE=mock` in
`.env.local` (demo accounts are in the README).

---

## What was made account-portable (for reference)

- `amplify.yml` used to hardcode the old account's app ID — it now uses the
  `$AWS_APP_ID` / `$AWS_BRANCH` variables Amplify provides in every build.
- The email sender and app URL are now the `FROM_EMAIL` / `APP_URL` environment
  variables instead of hardcoded values, and the distributor Lambda finally has
  SES send permission (it was missing before, so emails always failed).
- The `/api/translate` route gets `GEMINI_API_KEY` through the hosting
  environment (written to `.env.production` at build time).
- Nothing else references an account, region or domain: everything is created
  by `ampx pipeline-deploy` and consumed through the generated
  `amplify_outputs.json`.
