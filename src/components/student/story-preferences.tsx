'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const TOPICS = [
  'Daily Life',
  'Travel',
  'Food',
  'Technology',
  'Sports',
  'Arts',
  'Nature',
  'History',
  'Science',
  'Business',
];

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner (A1-A2)' },
  { value: 'intermediate', label: 'Intermediate (B1-B2)' },
  { value: 'advanced', label: 'Advanced (C1-C2)' },
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
      const profile = await client.models.StudentProfile.get({ id: studentId });
      if (profile.data) {
        setDifficulty(profile.data.preferredDifficulty || 'intermediate');
        setSelectedTopics(profile.data.preferredTopics?.filter((t): t is string => t !== null) || []);
        setUseRandom(profile.data.useRandomTopics || false);
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
      await client.models.StudentProfile.update({
        id: studentId,
        preferredDifficulty: difficulty,
        preferredTopics: selectedTopics,
        useRandomTopics: useRandom,
      });
      onSave?.();
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Story Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Difficulty Level</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Preferred Topics</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="random"
                checked={useRandom}
                onCheckedChange={(checked) => setUseRandom(checked as boolean)}
              />
              <label
                htmlFor="random"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Random topics
              </label>
            </div>
          </div>
          
          {!useRandom && (
            <div className="grid grid-cols-2 gap-2">
              {TOPICS.map((topic) => (
                <div key={topic} className="flex items-center space-x-2">
                  <Checkbox
                    id={topic}
                    checked={selectedTopics.includes(topic)}
                    onCheckedChange={() => handleToggleTopic(topic)}
                  />
                  <label
                    htmlFor={topic}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {topic}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
