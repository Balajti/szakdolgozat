'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DifficultyAdjusterProps {
  text: string;
  currentLevel: string;
  onTextAdjusted?: (adjustedText: string, newLevel: string) => void;
}

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * "Könnyebb / nehezebb változat" control: rewrites the story text one CEFR
 * level down or up via the adjustDifficulty mutation.
 */
export function DifficultyAdjuster({ text, currentLevel, onTextAdjusted }: DifficultyAdjusterProps) {
  const [adjusting, setAdjusting] = useState<'simplify' | 'complexify' | null>(null);
  const { toast } = useToast();

  const currentLevelIndex = LEVEL_ORDER.indexOf(currentLevel.toUpperCase());
  const canSimplify = currentLevelIndex > 0;
  const canComplexify = currentLevelIndex >= 0 && currentLevelIndex < LEVEL_ORDER.length - 1;

  const handleAdjust = async (direction: 'simplify' | 'complexify') => {
    setAdjusting(direction);
    try {
      const targetIndex = direction === 'simplify' ? currentLevelIndex - 1 : currentLevelIndex + 1;
      const targetLevel = LEVEL_ORDER[targetIndex];

      const { client } = await import('@/lib/amplify-client');
      const response = await client.mutations.adjustDifficulty({
        text,
        currentLevel: currentLevel.toUpperCase(),
        targetLevel,
      });

      if (response.data?.adjustedText) {
        onTextAdjusted?.(response.data.adjustedText, targetLevel);
        toast({
          title: 'Szöveg átírva',
          description: `A történet mostantól ${targetLevel} szinten olvasható.`,
        });
      } else {
        throw new Error('No adjusted text returned');
      }
    } catch (error) {
      console.error('Error adjusting difficulty:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült átírni a szöveget. Próbáld újra.',
        variant: 'destructive',
      });
    } finally {
      setAdjusting(null);
    }
  };

  if (currentLevelIndex < 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => handleAdjust('simplify')}
        disabled={!canSimplify || adjusting !== null}
        variant="outline"
        size="sm"
        className="gap-1.5"
      >
        {adjusting === 'simplify' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
        Könnyebb változat{canSimplify ? ` (${LEVEL_ORDER[currentLevelIndex - 1]})` : ''}
      </Button>
      <Button
        onClick={() => handleAdjust('complexify')}
        disabled={!canComplexify || adjusting !== null}
        variant="outline"
        size="sm"
        className="gap-1.5"
      >
        {adjusting === 'complexify' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowUp className="h-4 w-4" />
        )}
        Nehezebb változat{canComplexify ? ` (${LEVEL_ORDER[currentLevelIndex + 1]})` : ''}
      </Button>
    </div>
  );
}
