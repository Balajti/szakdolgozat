import type { Schema } from '../../data/resource';
import type { AppSyncResolverEvent } from 'aws-lambda';

type PublishStoryHandler = Schema['publishStoryResult']['functionHandler'];
type PublishTranslationHandler = Schema['publishTranslationResult']['functionHandler'];

// This is a NONE datasource handler - it just passes through the arguments
// The actual subscription filtering happens in AppSync based on jobId
export const handler = async (event: AppSyncResolverEvent<any>) => {
    console.log('[PublishResults] Received event:', JSON.stringify(event, null, 2));

    // Try multiple paths to find fieldName — depending on how AppSync invokes the handler,
    // the field name may be in different locations
    const fieldName = event.info?.fieldName
        || (event as any).fieldName
        || (event as any).info?.parentTypeName;

    console.log('[PublishResults] Resolved fieldName:', fieldName);

    // Extract arguments - they may be at different paths depending on invocation
    const args = event.arguments || (event as any).args || {};

    // Subscription connection handlers
    if (fieldName === 'onStoryGenerationUpdate') {
        return {
            jobId: args.jobId,
            status: "pending",
            story: null,
            newWords: [],
            error: null
        };
    }

    if (fieldName === 'onWordTranslationUpdate') {
        return {
            jobId: args.jobId,
            status: "pending",
            translation: null,
            error: null
        };
    }

    // Mutation handlers
    if (fieldName === 'publishStoryResult') {
        return {
            jobId: args.jobId,
            status: args.status,
            story: args.story || null,
            newWords: args.newWords || [],
            error: args.error || null
        };
    }

    if (fieldName === 'publishTranslationResult') {
        return {
            jobId: args.jobId,
            status: args.status,
            translation: args.translation || null,
            error: args.error || null
        };
    }

    // If fieldName is undefined, try to infer from the arguments present
    console.warn(`[PublishResults] Unknown fieldName: ${fieldName}, attempting to infer from args`);

    if (args.story !== undefined || args.newWords !== undefined) {
        // Looks like a publishStoryResult call
        console.log('[PublishResults] Inferred: publishStoryResult');
        return {
            jobId: args.jobId,
            status: args.status,
            story: args.story || null,
            newWords: args.newWords || [],
            error: args.error || null
        };
    }

    if (args.translation !== undefined) {
        // Looks like a publishTranslationResult call
        console.log('[PublishResults] Inferred: publishTranslationResult');
        return {
            jobId: args.jobId,
            status: args.status,
            translation: args.translation || null,
            error: args.error || null
        };
    }

    // If we have a jobId and status, just pass them through
    if (args.jobId && args.status) {
        console.log('[PublishResults] Passing through with available args');
        return {
            jobId: args.jobId,
            status: args.status,
            story: args.story || null,
            newWords: args.newWords || [],
            error: args.error || null
        };
    }

    // Last resort fallback
    console.error(`[PublishResults] Cannot determine field, full event:`, JSON.stringify(event));
    return {
        jobId: args.jobId || "unknown",
        status: "failed",
        error: `Unknown fieldName: ${fieldName}`
    };
};
