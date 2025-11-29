import { useState, useCallback, useEffect, useRef } from 'react';
import { client } from '@/lib/amplify-client';

interface StoryGenerationArgs {
    level: string;
    age?: number;
    knownWords?: string[];
    unknownWords?: string[];
    requiredWords?: string[];
    excludedWords?: string[];
    topic?: string;
    customWords?: string[];
    difficulty?: string;
    mode: 'placement' | 'personalized' | 'teacher';
}

interface HighlightedWord {
    word: string;
    offset: number;
    length: number;
}

interface Story {
    id: string;
    title: string;
    content: string;
    level: string;
    createdAt: string;
    highlightedWords?: HighlightedWord[];
}

interface Word {
    id: string;
    text: string;
    translation: string;
}

interface StoryGenerationResult {
    story: Story;
    newWords: Word[];
}

interface UseAsyncStoryGenerationReturn {
    generateStory: (args: StoryGenerationArgs) => Promise<string>; // Returns jobId
    isGenerating: boolean;
    error: string | null;
    result: StoryGenerationResult | null;
    reset: () => void;
}

export function useAsyncStoryGeneration(): UseAsyncStoryGenerationReturn {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<StoryGenerationResult | null>(null);
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
        setIsGenerating(false);
        setError(null);
        setResult(null);
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }
        currentJobIdRef.current = null;
    }, []);

    const generateStory = useCallback(async (args: StoryGenerationArgs): Promise<string> => {
        // Clean up any existing subscription
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
            subscriptionRef.current = null;
        }

        setIsGenerating(true);
        setError(null);
        setResult(null);

        try {
            // Start story generation - this returns a jobId
            const startGenerationMutation = /* GraphQL */ `
        mutation StartStoryGeneration(
          $level: String!
          $age: Int
          $knownWords: [String]
          $unknownWords: [String]
          $requiredWords: [String]
          $excludedWords: [String]
          $topic: String
          $customWords: [String]
          $difficulty: String
          $mode: StoryGenerationMode!
        ) {
          startStoryGeneration(
            level: $level
            age: $age
            knownWords: $knownWords
            unknownWords: $unknownWords
            requiredWords: $requiredWords
            excludedWords: $excludedWords
            topic: $topic
            customWords: $customWords
            difficulty: $difficulty
            mode: $mode
          ) {
            jobId
            status
          }
        }
      `;

            const response = await client.graphql({
                query: startGenerationMutation,
                variables: args,
            }) as { data: { startStoryGeneration: { jobId: string; status: string } } };

            const jobId = response.data.startStoryGeneration.jobId;
            currentJobIdRef.current = jobId;

            // Subscribe to updates for this job
            const subscriptionQuery = /* GraphQL */ `
        subscription OnStoryGenerationUpdate($jobId: String!) {
          onStoryGenerationUpdate(jobId: $jobId) {
            jobId
            status
            story {
              id
              title
              content
              level
              createdAt
              highlightedWords {
                word
                offset
                length
              }
            }
            newWords {
              id
              text
              translation
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
                    const update = event.data?.onStoryGenerationUpdate;

                    if (!update) return;

                    // Only process if this is for the current job
                    if (update.jobId !== currentJobIdRef.current) return;

                    if (update.status === 'completed' && update.story) {
                        setResult({
                            story: update.story,
                            newWords: update.newWords || [],
                        });
                        setIsGenerating(false);
                        setError(null);

                        // Unsubscribe after receiving result
                        if (subscriptionRef.current) {
                            subscriptionRef.current.unsubscribe();
                            subscriptionRef.current = null;
                        }
                    } else if (update.status === 'failed') {
                        setError(update.error || 'Story generation failed');
                        setIsGenerating(false);

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
                    setIsGenerating(false);

                    if (subscriptionRef.current) {
                        subscriptionRef.current.unsubscribe();
                        subscriptionRef.current = null;
                    }
                },
            });

            subscriptionRef.current = subscription;

            return jobId;
        } catch (err: any) {
            console.error('Error starting story generation:', err);
            setError(err.message || 'Failed to start story generation');
            setIsGenerating(false);
            throw err;
        }
    }, []);

    return {
        generateStory,
        isGenerating,
        error,
        result,
        reset,
    };
}
