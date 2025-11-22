'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DifficultyAdjusterProps {
  text: string;
  currentLevel: string;
  onTextAdjusted?: (adjustedText: string, newLevel: string) => void;
}

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function DifficultyAdjuster({ text: _text, currentLevel, onTextAdjusted: _onTextAdjusted }: DifficultyAdjusterProps) {
  const [adjusting, setAdjusting] = useState(false);
  const { toast } = useToast();

  const currentLevelIndex = LEVEL_ORDER.indexOf(currentLevel.toUpperCase());
  const canSimplify = currentLevelIndex > 0;
  const canComplexify = currentLevelIndex < LEVEL_ORDER.length - 1;

  const handleAdjust = async (direction: 'simplify' | 'complexify') => {
    setAdjusting(true);
    try {
      const targetIndex = direction === 'simplify' ? currentLevelIndex - 1 : currentLevelIndex + 1;
      const targetLevel = LEVEL_ORDER[targetIndex];

      const { client } = await import('@/lib/amplify-client');
      const response = await client.mutations.adjustDifficulty({
        text: _text,
        currentLevel,
        targetLevel,
      });

      toast({
        title: 'Text Adjusted',
        description: `Text has been ${direction === 'simplify' ? 'simplified' : 'made more complex'} to ${targetLevel} level.`,
      });

      if (response.data?.adjustedText) {
        _onTextAdjusted?.(response.data.adjustedText, targetLevel);
      }
    } catch (error) {
      console.error('Error adjusting difficulty:', error);
      toast({
        title: 'Error',
        description: 'Failed to adjust text difficulty. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjust Difficulty</CardTitle>
        <CardDescription>
          Current level: <span className="font-semibold">{currentLevel.toUpperCase()}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          onClick={() => handleAdjust('simplify')}
          disabled={!canSimplify || adjusting}
          variant="outline"
          className="flex-1"
        >
          <ArrowDown className="h-4 w-4 mr-2" />
          Simplify
          {canSimplify && ` (to ${LEVEL_ORDER[currentLevelIndex - 1]})`}
        </Button>
        <Button
          onClick={() => handleAdjust('complexify')}
          disabled={!canComplexify || adjusting}
          variant="outline"
          className="flex-1"
        >
          <ArrowUp className="h-4 w-4 mr-2" />
          Make Complex
          {canComplexify && ` (to ${LEVEL_ORDER[currentLevelIndex + 1]})`}
        </Button>
      </CardContent>
    </Card>
  );
}
