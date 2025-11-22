'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Copy, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AssignmentTemplate {
  id: string;
  title: string;
  level: string;
  assignmentType: string;
  requiredWords?: string[];
  excludedWords?: string[];
  usageCount: number;
  isTemplate: boolean;
  createdAt: string;
}

interface AssignmentTemplatesProps {
  teacherId: string;
  onUseTemplate?: (template: AssignmentTemplate) => void;
}

export function AssignmentTemplates({ teacherId, onUseTemplate }: AssignmentTemplatesProps) {
  const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadTemplates = useCallback(async () => {
    try {
      const { client } = await import('@/lib/amplify-client');
      const response = await client.models.Assignment.list({
        filter: {
          teacherId: { eq: teacherId },
          isTemplate: { eq: true }
        }
      });
      if (response.data) {
        setTemplates(response.data as unknown as AssignmentTemplate[]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading templates:', error);
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleUseTemplate = async (template: AssignmentTemplate) => {
    try {
      // Increment usage count
      const { client } = await import('@/lib/amplify-client');
      await client.models.Assignment.update({
        id: template.id,
        usageCount: (template.usageCount || 0) + 1,
      });

      toast({
        title: 'Template Selected',
        description: 'Template has been loaded for customization.',
      });

      onUseTemplate?.(template);
      loadTemplates();
    } catch (error) {
      console.error('Error using template:', error);
      toast({
        title: 'Error',
        description: 'Failed to use template.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const { client } = await import('@/lib/amplify-client');
      await client.models.Assignment.delete({ id: templateId });
      toast({
        title: 'Template Deleted',
        description: 'Assignment template has been deleted.',
      });
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Assignment Templates</h2>
          <p className="text-muted-foreground">Reuse successful assignments to save time</p>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No templates yet. Save an assignment as a template to reuse it later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Level: {template.level} • Type: {template.assignmentType}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {template.requiredWords && template.requiredWords.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Required Words:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.requiredWords.slice(0, 5).map((word, index) => (
                        <Badge key={index} variant="default" className="text-xs">
                          {word}
                        </Badge>
                      ))}
                      {template.requiredWords.length > 5 && (
                        <Badge variant="default" className="text-xs">
                          +{template.requiredWords.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="text-sm text-muted-foreground">
                    Used {template.usageCount || 0} times
                  </div>
                  <Button
                    onClick={() => handleUseTemplate(template)}
                    size="sm"
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
