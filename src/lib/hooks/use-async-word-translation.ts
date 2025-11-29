import { useState, useCallback, useEffect, useRef } from 'react';
import { client } from '@/lib/amplify-client';

interface WordTranslationArgs {
    word: string;
    sourceLanguage?: string;
    targetLanguage: string;
}

interface WordTranslation {
    word: string;
    translation: string;
    sourceLanguage: string;
    targetLanguage: string;
    exampleSentence?: string;
    exampleTranslation?: string;
    phonetic?: string;
    partOfSpeech?: string;
    pastTense?: string;
    futureTense?: string;
    pluralForm?: string;
    usageNotes?: string;
}

interface UseAsyncWordTranslationReturn {
    translateWord: (args: WordTranslationArgs) => Promise<string>; // Returns jobId
    isTranslating: boolean;
    error: string | null;
    translation: WordTranslation | null;
    reset: () => void;
}

export function useAsyncWordTranslation(): UseAsyncWordTranslationReturn {
    const [isTranslating, setIsTranslating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [translation, setTranslation] = useState<WordTranslation | null>(null);
    const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
    const currentJobIdRef = useRef<string | null>(null);

    // Cleanup subscription on unmount
    useEffect(() => {
        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
        };
    }, []);

    const reset = useCallback(() => {
        setIsTranslating(false);
        setError(null);
        setTranslation(null);
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }
        currentJobIdRef.current = null;
    }, []);

    const translateWord = useCallback(async (args: WordTranslationArgs): Promise<string> => {
        // Clean up any existing subscription
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }

        setIsTranslating(true);
        setError(null);
        setTranslation(null);

        try {
            // Start word translation - this returns a jobId
            const startTranslationMutation = /* GraphQL */ `
        mutation StartWordTranslation(
          $word: String!
          $sourceLanguage: String
          $targetLanguage: String!
        ) {
          startWordTranslation(
            word: $word
            sourceLanguage: $sourceLanguage
            targetLanguage: $targetLanguage
          ) {
            jobId
            status
          }
        }
      `;

            const response = await client.graphql({
                query: startTranslationMutation,
                variables: args,
            }) as { data: { startWordTranslation: { jobId: string; status: string } } };

            const jobId = response.data.startWordTranslation.jobId;
            currentJobIdRef.current = jobId;

            // Subscribe to updates for this job
            const subscriptionQuery = /* GraphQL */ `
        subscription OnWordTranslationUpdate($jobId: String!) {
          onWordTranslationUpdate(jobId: $jobId) {
            jobId
            status
            translation {
              word
              translation
              sourceLanguage
              targetLanguage
              exampleSentence
              exampleTranslation
              phonetic
              partOfSpeech
              pastTense
              futureTense
              pluralForm
              usageNotes
            }
            error
          }
        }
      `;

            const subscription = (client.graphql({
                query: subscriptionQuery,
                variables: { jobId },
            }) as any).subscribe({
                next: (event: any) => {
                    const update = event.data?.onWordTranslationUpdate;

                    if (!update) return;

                    // Only process if this is for the current job
                    if (update.jobId !== currentJobIdRef.current) return;

                    if (update.status === 'completed' && update.translation) {
                        setTranslation(update.translation);
                        setIsTranslating(false);
                        setError(null);

                        // Unsubscribe after receiving result
                        if (subscriptionRef.current) {
                            subscriptionRef.current.unsubscribe();
                            subscriptionRef.current = null;
                        }
                    } else if (update.status === 'failed') {
                        setError(update.error || 'Word translation failed');
                        setIsTranslating(false);

                        // Unsubscribe on error
                        if (subscriptionRef.current) {
                            subscriptionRef.current.unsubscribe();
                            subscriptionRef.current = null;
                        }
                    }
                    // For 'pending' and 'processing' statuses, keep waiting
                },
                error: (err: any) => {
                    console.error('Subscription error:', err);
                    setError('Subscription error: ' + (err.message || 'Unknown error'));
                    setIsTranslating(false);

                    if (subscriptionRef.current) {
                        subscriptionRef.current.unsubscribe();
                        subscriptionRef.current = null;
                    }
                },
            });

            subscriptionRef.current = subscription;

            return jobId;
        } catch (err: any) {
            console.error('Error starting word translation:', err);
            setError(err.message || 'Failed to start word translation');
            setIsTranslating(false);
            throw err;
        }
    }, []);

    return {
        translateWord,
        isTranslating,
        error,
        translation,
        reset,
    };
}
