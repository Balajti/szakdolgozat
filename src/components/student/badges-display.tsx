'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';

interface BadgeItem {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  isUnlocked: boolean;
  achievedAt?: string;
}

interface BadgesDisplayProps {
  studentId: string;
}

export function BadgesDisplay({ studentId }: BadgesDisplayProps) {
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBadges = useCallback(async () => {
    try {
      const { client } = await import('@/lib/amplify-client');
      const response = await client.mutations.checkBadges({ studentId });
      if (response.data?.allBadges) {
        const badgeData = JSON.parse(response.data.allBadges as string);
        setBadges(badgeData);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading badges:', error);
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  if (loading) {
    return <div>Loading badges...</div>;
  }

  const unlockedBadges = badges.filter(b => b.isUnlocked);
  const lockedBadges = badges.filter(b => !b.isUnlocked);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Badges</h2>
        <Badge variant="default">
          {unlockedBadges.length} / {badges.length} Unlocked
        </Badge>
      </div>

      {/* Unlocked Badges */}
      {unlockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Unlocked</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {unlockedBadges.map((badge) => (
              <Card key={badge.id} className="border-2 border-primary">
                <CardHeader className="text-center pb-2">
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <CardTitle className="text-sm">{badge.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-xs">{badge.description}</CardDescription>
                  {badge.achievedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(badge.achievedAt).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">In Progress</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {lockedBadges.map((badge) => (
              <Card key={badge.id} className="opacity-75">
                <CardHeader className="text-center pb-2">
                  <div className="relative text-4xl mb-2">
                    <span className="blur-sm">{badge.icon}</span>
                    <Lock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6" />
                  </div>
                  <CardTitle className="text-sm">{badge.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-2">
                  <CardDescription className="text-xs">{badge.description}</CardDescription>
                  <div className="space-y-1">
                    <Progress value={(badge.progress / badge.target) * 100} />
                    <p className="text-xs text-muted-foreground">
                      {badge.progress} / {badge.target}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
