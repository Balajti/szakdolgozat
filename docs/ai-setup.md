# AI Story Generation Setup

This project uses Google's Gemini AI for generating personalized English learning stories.

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy the generated API key

## Setting Up Locally

1. Create a `.env.local` file in the project root:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your Gemini API key to `.env.local`:
   ```
   GEMINI_API_KEY=your-actual-api-key-here
   ```

3. Restart your sandbox:
   ```bash
   npx ampx sandbox
   ```

## Setting Up for Production (AWS Amplify)

1. Go to AWS Amplify Console
2. Select your app
3. Go to "Environment variables"
4. Add: `GEMINI_API_KEY` = `your-actual-api-key`
5. Redeploy your app

## Story Generation Features

The AI generates stories with:
- **Age-appropriate content** (based on student age)
- **CEFR level matching** (A1-C2)
- **Vocabulary targeting** (includes specific words to learn)
- **Word highlighting** (marks unknown words in the story)
- **Engaging narratives** (beginning, middle, end with dialogue)

### Generation Modes

- **Placement**: Assessment stories for vocabulary testing
- **Personalized**: Stories matching student's vocabulary level
- **Teacher**: Assignment stories for classroom use

## Fallback Behavior

If the Gemini API fails or is unavailable, the system automatically generates a simple fallback story to ensure users can always practice.
