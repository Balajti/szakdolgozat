import type { Schema } from '../../data/resource';
import type { AppSyncResolverEvent } from 'aws-lambda';

type PublishStoryHandler = Schema['publishStoryResult']['functionHandler'];
type PublishTranslationHandler = Schema['publishTranslationResult']['functionHandler'];

// This is a NONE datasource handler - it just passes through the arguments
// The actual subscription filtering happens in AppSync based on jobId
export const handler = async (event: AppSyncResolverEvent<any>) => {
    console.log('[PublishResults] Received event:', JSON.stringify(event, null, 2));

    const fieldName = event.info?.fieldName;

    // Subscription connection handlers
    if (fieldName === 'onStoryGenerationUpdate') {
        return {
            jobId: event.arguments.jobId,
            status: "pending",
            story: null,
            newWords: [],
            error: null
        };
    }

    if (fieldName === 'onWordTranslationUpdate') {
        return {
            jobId: event.arguments.jobId,
            status: "pending",
            translation: null,
            error: null
        };
    }

    // Mutation handlers
    if (fieldName === 'publishStoryResult') {
        return {
            jobId: event.arguments.jobId,
            status: event.arguments.status,
            story: event.arguments.story,
            newWords: event.arguments.newWords,
            error: event.arguments.error
        };
    }

    if (fieldName === 'publishTranslationResult') {
        return {
            jobId: event.arguments.jobId,
            status: event.arguments.status,
            translation: event.arguments.translation,
            error: event.arguments.error
        };
    }

    // Fallback for unknown fields to prevent null errors
    console.warn(`[PublishResults] Unknown fieldName: ${fieldName}`);
    return {
        jobId: event.arguments.jobId || "unknown",
        status: "failed",
        error: `Unknown fieldName: ${fieldName}`
    };
};
