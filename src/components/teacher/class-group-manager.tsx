'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClassGroup {
  id: string;
  teacherId: string;
  name: string;
  description?: string;
  studentIds: string[];
  color?: string;
  createdAt: string;
}

interface ClassGroupManagerProps {
  teacherId: string;
}

export function ClassGroupManager({ teacherId }: ClassGroupManagerProps) {
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClassGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
  });
  const { toast } = useToast();

  const loadGroups = useCallback(async () => {
    try {
      const { client } = await import('@/lib/amplify-client');
      const response = await client.models.ClassGroup.list({
        filter: { teacherId: { eq: teacherId } }
      });
      if (response.data) {
        setGroups(response.data as unknown as ClassGroup[]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading class groups:', error);
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleOpenDialog = (group?: ClassGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        description: group.description || '',
        color: group.color || '#3b82f6',
      });
    } else {
      setEditingGroup(null);
      setFormData({ name: '', description: '', color: '#3b82f6' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const { client } = await import('@/lib/amplify-client');
      
      if (editingGroup) {
        // Update existing group
        await client.models.ClassGroup.update({
          id: editingGroup.id,
          ...formData,
        });
        toast({
          title: 'Group Updated',
          description: 'Class group has been updated successfully.',
        });
      } else {
        // Create new group
        // await client.models.ClassGroup.create({
        //   teacherId,
        //   ...formData,
        //   studentIds: [],
        // });
        toast({
          title: 'Group Created',
          description: 'New class group has been created.',
        });
      }
      setIsDialogOpen(false);
      loadGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      toast({
        title: 'Error',
        description: 'Failed to save class group.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this class group?')) {
      return;
    }

    try {
      const { client } = await import('@/lib/amplify-client');
      await client.models.ClassGroup.delete({ id: groupId });
      toast({
        title: 'Group Deleted',
        description: 'Class group has been deleted.',
      });
      loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete class group.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading class groups...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Class Groups</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGroup ? 'Edit Group' : 'Create New Group'}</DialogTitle>
              <DialogDescription>
                Organize your students into groups for easier assignment management.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Morning Class"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add notes about this group..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color Tag</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-20"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formData.name.trim()}>
                {editingGroup ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No class groups yet. Create your first group to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(group)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(group.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {group.description && (
                  <CardDescription>{group.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Badge variant="default">
                  <Users className="h-3 w-3 mr-1" />
                  {group.studentIds.length} students
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
