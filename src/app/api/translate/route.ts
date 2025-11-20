import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/../../amplify/data/resource';
import { NextRequest, NextResponse } from 'next/server';

const client = generateClient<Schema>();

export async function POST(request: NextRequest) {
  try {
    const { word, sourceLanguage = 'en', targetLanguage = 'hu' } = await request.json();

    if (!word) {
      return NextResponse.json(
        { error: 'Word is required' },
        { status: 400 }
      );
    }

    // Call the translateWord query
    const { data, errors } = await client.queries.translateWord({
      word,
      sourceLanguage,
      targetLanguage
    });

    if (errors && errors.length > 0) {
      console.error('Translation errors:', errors);
      return NextResponse.json(
        { error: 'Translation failed', details: errors },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
