'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar } from 'lucide-react';

interface Story {
  id: string;
  title: string;
  content: string;
  difficulty?: string;
  topic?: string;
  readCount?: number;
  createdAt: string;
}

interface RecentStoriesProps {
  studentId: string;
  onSelectStory?: (story: Story) => void;
}

export function RecentStories({ studentId, onSelectStory }: RecentStoriesProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStories = useCallback(async () => {
    try {
      const { generateClient } = await import('aws-amplify/api');
      const client = generateClient();
      const response = await client.queries.listStudentStories({
        studentId,
        limit: 30,
      });
      if (response.data?.stories) {
        const sortedStories = (response.data.stories as Story[]).sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setStories(sortedStories);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading stories:', error);
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  if (loading) {
    return <div>Loading stories...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Stories</CardTitle>
        <CardDescription>
          Your last {Math.min(stories.length, 30)} stories (older stories are automatically archived)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mb-4" />
            <p>No stories yet. Generate your first story to get started!</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {stories.map((story) => (
                <Card
                  key={story.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onSelectStory?.(story)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{story.title}</CardTitle>
                      {story.readCount && story.readCount > 1 && (
                        <Badge variant="default" className="text-xs">
                          Read {story.readCount}x
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {story.difficulty && (
                        <Badge variant="outline" className="text-xs">
                          {story.difficulty}
                        </Badge>
                      )}
                      {story.topic && (
                        <Badge variant="outline" className="text-xs">
                          {story.topic}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(story.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {story.content.substring(0, 150)}...
                    </p>
                    <Button
                      variant="link"
                      className="px-0 h-auto mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStory?.(story);
                      }}
                    >
                      Read more
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
