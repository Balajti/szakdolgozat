'use client';

import { useEffect, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  className?: string;
}

export function RecentStories({ studentId, onSelectStory, className }: RecentStoriesProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStories = useCallback(async () => {
    try {
      const { client } = await import('@/lib/amplify-client');
      
      const listStoriesByStudentQuery = /* GraphQL */ `
        query ListStoriesByStudent($studentId: ID!, $limit: Int) {
          listStoriesByStudent(studentId: $studentId, limit: $limit) {
            items {
              id
              title
              content
              difficulty
              topic
              readCount
              createdAt
            }
          }
        }
      `;

      const response = await client.graphql({
        query: listStoriesByStudentQuery,
        variables: { studentId, limit: 30 }
      }) as { data: { listStoriesByStudent: { items: Story[] } } };

      if (response.data?.listStoriesByStudent?.items) {
        const sortedStories = response.data.listStoriesByStudent.items.sort((a, b) =>
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
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Történetek betöltése...
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Még nincsenek történetek.</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Generáld az első történetedet a kezdéshez!</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-[500px]", className)}>
      <div className="space-y-3 pr-4">
        {stories.map((story) => (
          <div
            key={story.id}
            className="group cursor-pointer rounded-2xl border border-border/40 bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
            onClick={() => onSelectStory?.(story)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {story.title}
                </h4>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {story.difficulty && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-0">
                      {story.difficulty}
                    </Badge>
                  )}
                  {story.topic && (
                    <Badge variant="outline" className="bg-accent/10 text-accent border-0">
                      {story.topic}
                    </Badge>
                  )}
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(story.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                  {story.content.substring(0, 150)}...
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </div>
            {story.readCount && story.readCount > 1 && (
              <div className="mt-3 pt-3 border-t border-border/40">
                <span className="text-xs text-muted-foreground">{story.readCount}x elolvasva</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
