'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QuizGeneratorButtonProps {
  storyId: string;
  onQuizGenerated?: (quizId: string) => void;
}

export function QuizGeneratorButton({ storyId: _storyId, onQuizGenerated: _onQuizGenerated }: QuizGeneratorButtonProps) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateQuiz = async () => {
    setGenerating(true);
    try {
      const { client } = await import('@/lib/amplify-client');
      const response = await client.mutations.generateQuiz({ storyId: _storyId });
      
      toast({
        title: 'Quiz Generated!',
        description: 'Your comprehension quiz is ready.',
      });
      
      if (response.data?.quizId) {
        _onQuizGenerated?.(response.data.quizId);
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleGenerateQuiz}
      disabled={generating}
      variant="outline"
      className="gap-2"
    >
      <Sparkles className="h-4 w-4" />
      {generating ? 'Generating Quiz...' : 'Generate Quiz'}
    </Button>
  );
}
