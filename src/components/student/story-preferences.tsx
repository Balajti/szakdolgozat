'use client';

import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const TOPICS = [
  'Mindennapi élet',
  'Utazás',
  'Étel',
  'Technológia',
  'Sport',
  'Művészet',
  'Természet',
  'Történelem',
  'Tudomány',
  'Üzlet',
];

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Kezdő (A1-A2)' },
  { value: 'intermediate', label: 'Középhaladó (B1-B2)' },
  { value: 'advanced', label: 'Haladó (C1-C2)' },
];

interface StoryPreferencesProps {
  studentId: string;
  onSave?: () => void;
}

export function StoryPreferences({ studentId, onSave }: StoryPreferencesProps) {
  const [difficulty, setDifficulty] = useState('intermediate');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [useRandom, setUseRandom] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      const { client } = await import('@/lib/amplify-client');
      
      const getProfileQuery = /* GraphQL */ `
        query GetStudentProfile($id: ID!) {
          getStudentProfile(id: $id) {
            id
            preferredDifficulty
            preferredTopics
            useRandomTopics
          }
        }
      `;
      
      const response = await client.graphql({
        query: getProfileQuery,
        variables: { id: studentId }
      }) as { data: { getStudentProfile: { preferredDifficulty?: string; preferredTopics?: (string | null)[]; useRandomTopics?: boolean } } };
      
      if (response.data?.getStudentProfile) {
        const profile = response.data.getStudentProfile;
        setDifficulty(profile.preferredDifficulty || 'intermediate');
        setSelectedTopics(profile.preferredTopics?.filter((t): t is string => t !== null) || []);
        setUseRandom(profile.useRandomTopics || false);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, [studentId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { client } = await import('@/lib/amplify-client');
      
      const updateProfileMutation = /* GraphQL */ `
        mutation UpdateStudentProfile($input: UpdateStudentProfileInput!) {
          updateStudentProfile(input: $input) {
            id
            preferredDifficulty
            preferredTopics
            useRandomTopics
          }
        }
      `;
      
      await client.graphql({
        query: updateProfileMutation,
        variables: {
          input: {
            id: studentId,
            preferredDifficulty: difficulty,
            preferredTopics: selectedTopics,
            useRandomTopics: useRandom,
          }
        }
      });
      onSave?.();
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl bg-card rounded-2xl border border-border/40 p-8">
      <div className="space-y-8">
        <div className="space-y-3">
          <Label className="text-base font-semibold">Nehézségi szint</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTY_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Preferált témák</Label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
              <Checkbox
                id="random"
                checked={useRandom}
                onCheckedChange={(checked) => setUseRandom(checked as boolean)}
              />
              <label
                htmlFor="random"
                className="text-sm font-medium cursor-pointer"
              >
                Véletlenszerű témák
              </label>
            </div>
          </div>
          
          {!useRandom && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TOPICS.map((topic) => (
                <div 
                  key={topic} 
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleToggleTopic(topic)}
                >
                  <Checkbox
                    id={topic}
                    checked={selectedTopics.includes(topic)}
                    onCheckedChange={() => handleToggleTopic(topic)}
                  />
                  <label
                    htmlFor={topic}
                    className="text-sm font-medium cursor-pointer flex-1"
                  >
                    {topic}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
          {saving ? 'Mentés...' : 'Beállítások mentése'}
        </Button>
      </div>
    </div>
  );
}
