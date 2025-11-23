'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Users,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface ClassGroup {
  id: string;
  name: string;
  description?: string;
  studentIds?: string[];
  color?: string;
  createdAt?: string;
}

interface ClassesManagementProps {
  teacherId: string;
}

export function ClassesManagement({ teacherId }: ClassesManagementProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadClasses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  const loadClasses = async () => {
    try {
      const { client } = await import('@/lib/amplify-client');
      
      const listClassesQuery = /* GraphQL */ `
        query ListGroupsByTeacher($teacherId: ID!) {
          listGroupsByTeacher(teacherId: $teacherId) {
            items {
              id
              name
              description
              studentIds
              color
              createdAt
            }
          }
        }
      `;

      const response = await client.graphql({
        query: listClassesQuery,
        variables: { teacherId }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (response as any).data?.listGroupsByTeacher?.items || [];
      setClasses(items);
      setLoading(false);
    } catch (error) {
      console.error('Error loading classes:', error);
      setLoading(false);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült betölteni az osztályokat.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateClass = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Hiányzó adat',
        description: 'Az osztály neve kötelező.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { client } = await import('@/lib/amplify-client');
      
      const createClassMutation = /* GraphQL */ `
        mutation CreateClassGroup($input: CreateClassGroupInput!) {
          createClassGroup(input: $input) {
            id
            name
            description
            studentIds
            color
            createdAt
          }
        }
      `;

      const response = await client.graphql({
        query: createClassMutation,
        variables: {
          input: {
            teacherId,
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            studentIds: [],
            color: getRandomColor(),
          }
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newClass = (response as any).data?.createClassGroup;
      if (newClass) {
        setClasses([...classes, newClass]);
        setIsCreateDialogOpen(false);
        setFormData({ name: '', description: '' });
        toast({
          title: 'Sikeres létrehozás',
          description: `Az osztály "${newClass.name}" sikeresen létrehozva.`,
        });
      }
    } catch (error) {
      console.error('Error creating class:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült létrehozni az osztályt.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClass = async () => {
    if (!selectedClass || !formData.name.trim()) {
      toast({
        title: 'Hiányzó adat',
        description: 'Az osztály neve kötelező.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { client } = await import('@/lib/amplify-client');
      
      const updateClassMutation = /* GraphQL */ `
        mutation UpdateClassGroup($input: UpdateClassGroupInput!) {
          updateClassGroup(input: $input) {
            id
            name
            description
            studentIds
            color
            createdAt
          }
        }
      `;

      const response = await client.graphql({
        query: updateClassMutation,
        variables: {
          input: {
            id: selectedClass.id,
            name: formData.name.trim(),
            description: formData.description.trim() || null,
          }
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedClass = (response as any).data?.updateClassGroup;
      if (updatedClass) {
        setClasses(classes.map(c => c.id === updatedClass.id ? updatedClass : c));
        setIsEditDialogOpen(false);
        setSelectedClass(null);
        setFormData({ name: '', description: '' });
        toast({
          title: 'Sikeres módosítás',
          description: `Az osztály "${updatedClass.name}" sikeresen frissítve.`,
        });
      }
    } catch (error) {
      console.error('Error updating class:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült frissíteni az osztályt.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;

    setSubmitting(true);
    try {
      const { client } = await import('@/lib/amplify-client');
      
      const deleteClassMutation = /* GraphQL */ `
        mutation DeleteClassGroup($input: DeleteClassGroupInput!) {
          deleteClassGroup(input: $input) {
            id
          }
        }
      `;

      await client.graphql({
        query: deleteClassMutation,
        variables: {
          input: {
            id: selectedClass.id,
          }
        }
      });

      setClasses(classes.filter(c => c.id !== selectedClass.id));
      setIsDeleteDialogOpen(false);
      setSelectedClass(null);
      toast({
        title: 'Sikeres törlés',
        description: `Az osztály "${selectedClass.name}" törölve.`,
      });
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült törölni az osztályt.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (classGroup: ClassGroup) => {
    setSelectedClass(classGroup);
    setFormData({
      name: classGroup.name,
      description: classGroup.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (classGroup: ClassGroup) => {
    setSelectedClass(classGroup);
    setIsDeleteDialogOpen(true);
  };

  const getRandomColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Osztályok</h2>
          <p className="text-sm text-muted-foreground">
            Kezeld az osztályaidat és a diákjaidat
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Új osztály
        </Button>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nincs még osztály</h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
              Hozz létre egy osztályt, hogy diákokat hívj meg és feladatokat oszz ki.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Első osztály létrehozása
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((classGroup) => (
            <Card
              key={classGroup.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => router.push(`/teacher/class/${classGroup.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: classGroup.color || '#4ECDC4' }}
                  >
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(classGroup);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Átnevezés
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog(classGroup);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Törlés
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-xl mt-3 break-words line-clamp-2">
                  {classGroup.name}
                </CardTitle>
                <CardDescription className="break-words line-clamp-2">
                  {classGroup.description || 'Nincs leírás'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{classGroup.studentIds?.length || 0} diák</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Új osztály létrehozása</DialogTitle>
            <DialogDescription>
              Add meg az osztály nevét és leírását.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Osztály neve *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="pl. 8.A Magyar"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Leírás (opcionális)</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Rövid leírás az osztályról..."
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length} / 200 karakter
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setFormData({ name: '', description: '' });
              }}
              disabled={submitting}
            >
              Mégse
            </Button>
            <Button onClick={handleCreateClass} disabled={submitting || !formData.name.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Létrehozás...
                </>
              ) : (
                'Létrehozás'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Osztály módosítása</DialogTitle>
            <DialogDescription>
              Módosítsd az osztály nevét vagy leírását.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Osztály neve *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="pl. 8.A Magyar"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Leírás (opcionális)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Rövid leírás az osztályról..."
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length} / 200 karakter
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedClass(null);
                setFormData({ name: '', description: '' });
              }}
              disabled={submitting}
            >
              Mégse
            </Button>
            <Button onClick={handleUpdateClass} disabled={submitting || !formData.name.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mentés...
                </>
              ) : (
                'Mentés'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Osztály törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretnéd a(z) &quot;{selectedClass?.name}&quot; osztályt?
              <br />
              <strong className="text-destructive">Ez a művelet nem vonható vissza.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedClass(null);
              }}
              disabled={submitting}
            >
              Mégse
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClass}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Törlés...
                </>
              ) : (
                'Törlés'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
