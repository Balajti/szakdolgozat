'use client';

import { useEffect, useState, useCallback } from 'react';
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
      
      const checkBadgesQuery = /* GraphQL */ `
        mutation CheckBadges($studentId: ID!) {
          checkBadges(studentId: $studentId) {
            newBadges
            allBadges
          }
        }
      `;

      const response = await client.graphql({
        query: checkBadgesQuery,
        variables: { studentId }
      }) as { data: { checkBadges: { allBadges: string } } };

      if (response.data?.checkBadges?.allBadges) {
        let badgeData = response.data.checkBadges.allBadges;
        
        // The data might be double-stringified, parse it properly
        if (typeof badgeData === 'string') {
          badgeData = JSON.parse(badgeData);
        }
        if (typeof badgeData === 'string') {
          badgeData = JSON.parse(badgeData);
        }
        
        // Ensure badgeData is an array
        if (Array.isArray(badgeData)) {
          setBadges(badgeData);
        } else {
          console.error('Badge data is not an array:', badgeData);
          setBadges([]);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading badges:', error);
      setBadges([]);
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Jelvények betöltése...</div>;
  }

  if (!Array.isArray(badges) || badges.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Még nincsenek elérhető jelvények.</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Teljesíts történeteket az eredmények feloldasához!</p>
      </div>
    );
  }

  const unlockedBadges = badges.filter(b => b.isUnlocked);
  const lockedBadges = badges.filter(b => !b.isUnlocked);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Fejlődés</p>
          <p className="text-2xl font-display font-bold mt-1">
            {unlockedBadges.length} / {badges.length} Feloldva
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-0 px-4 py-2">
          {Math.round((unlockedBadges.length / badges.length) * 100)}%
        </Badge>
      </div>

      {/* Unlocked Badges */}
      {unlockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Feloldott eredmények</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {unlockedBadges.map((badge) => (
              <div key={badge.id} className="bg-card rounded-2xl border-2 border-primary/40 p-6 text-center">
                <div className="text-5xl mb-3">{badge.icon}</div>
                <h4 className="font-semibold text-sm mb-1">{badge.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{badge.description}</p>
                {badge.achievedAt && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(badge.achievedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Folyamatban</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {lockedBadges.map((badge) => (
              <div key={badge.id} className="bg-card rounded-2xl border border-border/40 p-6 text-center">
                <div className="relative inline-flex items-center justify-center w-16 h-16 mb-3 bg-muted/30 rounded-full">
                  <Lock className="h-7 w-7 text-muted-foreground/60" />
                </div>
                <h4 className="font-semibold text-sm mb-1 text-muted-foreground">{badge.title}</h4>
                <p className="text-xs text-muted-foreground/70 mb-3">{badge.description}</p>
                <div className="space-y-2">
                  <Progress value={(badge.progress / badge.target) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {badge.progress} / {badge.target}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
