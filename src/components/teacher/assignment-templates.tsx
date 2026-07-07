'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorCard } from '@/components/ui/error-card';
import { FileText, Copy, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AssignmentTemplate {
  id: string;
  title: string;
  level: string;
  assignmentType: string;
  storyContent?: string | null;
  blankPositions?: string | null;
  requiredWords?: (string | null)[] | null;
  usageCount?: number | null;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  basic: 'Történet olvasása',
  fill_blanks: 'Hiányzó szavas',
  word_matching: 'Szópárosítás',
  custom_words: 'Egyedi szavak',
};

/**
 * Saved assignment templates: list, delete, and "use" — using a template
 * creates a fresh draft copy of the assignment and opens it so the teacher
 * can send it to a new class.
 */
export function AssignmentTemplates({ teacherId }: { teacherId: string }) {
  const router = useRouter();
  const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<AssignmentTemplate | null>(null);
  const { toast } = useToast();

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { client } = await import('@/lib/amplify-client');
      const response = await client.models.Assignment.list({
        filter: {
          teacherId: { eq: teacherId },
          isTemplate: { eq: true },
        },
      });
      setTemplates((response.data ?? []) as unknown as AssignmentTemplate[]);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleUseTemplate = async (template: AssignmentTemplate) => {
    setUsingTemplateId(template.id);
    try {
      const { client } = await import('@/lib/amplify-client');

      // New draft copy with a fresh due date, ready to send
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const created = await client.models.Assignment.create({
        teacherId,
        title: template.title,
        dueDate,
        level: template.level,
        status: 'draft',
        assignmentType: template.assignmentType as 'basic' | 'fill_blanks' | 'word_matching' | 'custom_words',
        storyContent: template.storyContent ?? null,
        blankPositions: template.blankPositions ?? null,
        requiredWords: (template.requiredWords ?? []).filter((w): w is string => !!w),
        isTemplate: false,
        originalAssignmentId: template.id,
      });

      if (!created.data?.id) {
        throw new Error(created.errors?.map((e) => e.message).join('; ') || 'Create failed');
      }

      await client.models.Assignment.update({
        id: template.id,
        usageCount: (template.usageCount ?? 0) + 1,
      });

      toast({
        title: 'Feladat létrehozva a sablonból',
        description: 'A másolat piszkozatként elkészült, most kiküldheted.',
      });

      router.push(`/teacher/assignment/${created.data.id}`);
    } catch (err) {
      console.error('Error using template:', err);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült létrehozni a feladatot a sablonból.',
        variant: 'destructive',
      });
    } finally {
      setUsingTemplateId(null);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    try {
      const { client } = await import('@/lib/amplify-client');
      await client.models.Assignment.delete({ id: templateToDelete.id });
      toast({
        title: 'Sablon törölve',
        description: 'A sablon véglegesen törölve lett.',
      });
      setTemplateToDelete(null);
      loadTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült törölni a sablont.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center">
        <ErrorCard title="Nem sikerült betölteni a sablonokat" onRetry={loadTemplates} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center max-w-sm">
              Még nincs sablonod. Egy feladatnál válaszd a „Mentés sablonként” lehetőséget,
              hogy később újra felhasználhasd — például jövőre egy új osztálynak.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg break-words">{template.title}</CardTitle>
                    <CardDescription className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="outline">{template.level}</Badge>
                      <Badge variant="outline">
                        {typeLabels[template.assignmentType] ?? template.assignmentType}
                      </Badge>
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTemplateToDelete(template)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {template.requiredWords && template.requiredWords.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Kötelező szavak:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.requiredWords.slice(0, 5).map((word, index) =>
                        word ? (
                          <Badge key={index} variant="outline" className="text-xs">
                            {word}
                          </Badge>
                        ) : null
                      )}
                      {template.requiredWords.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.requiredWords.length - 5} további
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm text-muted-foreground">
                    {template.usageCount || 0} alkalommal használva
                  </div>
                  <Button
                    onClick={() => handleUseTemplate(template)}
                    size="sm"
                    className="gap-2"
                    disabled={usingTemplateId !== null}
                  >
                    {usingTemplateId === template.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Használat
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sablon törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törlöd a(z) „{templateToDelete?.title}” sablont? Ez a művelet nem vonható vissza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
