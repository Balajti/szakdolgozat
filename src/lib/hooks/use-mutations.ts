import { useMutation, useQueryClient } from "@tanstack/react-query";

import { generateStory, updateWordMastery, type GenerateStoryInput, type GenerateStoryResult, type UpdateWordMasteryInput } from "@/lib/api/mutations";
import type { Word } from "@/lib/types";

interface UpdateWordMasteryOptions {
  onOptimistic?: (updated: Word) => void;
  onError?: (error: unknown) => void;
  onSettled?: () => void;
}

export function useUpdateWordMastery(options?: UpdateWordMasteryOptions) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWordMasteryInput) => updateWordMastery(input),
    onMutate: async (input) => {
      const updated: Word = {
        id: input.wordId,
        text: "", // Unknown locally; caller can merge
        translation: "",
        mastery: input.mastery,
        exampleSentence: undefined,
        lastReviewedAt: new Date().toISOString(),
      };
      options?.onOptimistic?.(updated);
    },
    onError: (err) => options?.onError?.(err),
    onSettled: () => options?.onSettled?.(),
    onSuccess: (word) => {
      // Invalidate dashboards so they refetch
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-dashboard"] });
      return word;
    },
  });
}

export function useGenerateStory() {
  const queryClient = useQueryClient();
  return useMutation<GenerateStoryResult, unknown, GenerateStoryInput>({
    mutationFn: (input) => generateStory(input),
    onSuccess: (result) => {
      // Refresh student dashboard; teacher dashboard may benefit if assignments use stories later.
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      return result;
    },
  });
}
