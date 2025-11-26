'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAvatarUrl } from '@/hooks/use-avatar-url';
import { useQueryClient } from '@tanstack/react-query';

const profileSchema = z.object({
  name: z.string().min(2, 'A név legalább 2 karakter legyen').max(60, 'Maximum 60 karakter'),
  school: z.string().optional(),
  bio: z.string().max(500, 'Maximum 500 karakter').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface TeacherProfileSettingsProps {
  teacherId: string;
}

export function TeacherProfileSettings({ teacherId }: TeacherProfileSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { toast } = useToast();
  const avatarUrl = useAvatarUrl(avatarPath);
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      school: '',
      bio: '',
    },
  });

  const loadProfile = useCallback(async () => {
    try {
      const { client } = await import('@/lib/amplify-client');

      const getProfileQuery = /* GraphQL */ `
        query GetTeacherProfile($id: ID!) {
          getTeacherProfile(id: $id) {
            id
            name
            school
            bio
            avatarUrl
          }
        }
      `;

      const response = await client.graphql({
        query: getProfileQuery,
        variables: { id: teacherId }
      }) as { data: { getTeacherProfile: { name?: string; school?: string; bio?: string; avatarUrl?: string } } };

      if (response.data?.getTeacherProfile) {
        const profile = response.data.getTeacherProfile;
        form.reset({
          name: profile.name || '',
          school: profile.school || '',
          bio: profile.bio || '',
        });
        setAvatarPath(profile.avatarUrl || null); // avatarUrl is actually the path
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoading(false);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült betölteni a profilt.',
        variant: 'destructive',
      });
    }
  }, [teacherId, form, toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      const { client } = await import('@/lib/amplify-client');

      const updateProfileMutation = /* GraphQL */ `
        mutation UpdateTeacherProfile($input: UpdateTeacherProfileInput!) {
          updateTeacherProfile(input: $input) {
            id
            name
            school
            bio
          }
        }
      `;

      await client.graphql({
        query: updateProfileMutation,
        variables: {
          input: {
            id: teacherId,
            name: values.name,
            school: values.school || null,
            bio: values.bio || null,
          }
        }
      });

      toast({
        title: 'Sikeres mentés',
        description: 'A profil adataid sikeresen frissítve lettek.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült frissíteni a profilt.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Hibás fájl típus',
        description: 'Kérlek, válassz képfájlt (jpg, png, stb.).',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Túl nagy fájl',
        description: 'A kép maximum 5MB lehet.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const { uploadData, getUrl } = await import('aws-amplify/storage');
      const { client } = await import('@/lib/amplify-client');

      // Upload to S3 using correct path pattern that matches storage configuration
      // The storage resource is configured with 'avatars/{entity_id}/*' pattern
      const fileName = `${Date.now()}-${file.name}`;
      const result = await uploadData({
        path: `avatars/${teacherId}/${fileName}`,
        data: file,
        options: {
          contentType: file.type,
        }
      }).result;

      // Store the path (not the URL) in the database
      const storagePath = result.path;

      // Update profile with avatar path
      const updateProfileMutation = /* GraphQL */ `
        mutation UpdateTeacherProfile($input: UpdateTeacherProfileInput!) {
          updateTeacherProfile(input: $input) {
            id
            avatarUrl
          }
        }
      `;

      await client.graphql({
        query: updateProfileMutation,
        variables: {
          input: {
            id: teacherId,
            avatarUrl: storagePath, // Store the path, not the URL
          }
        }
      });

      setAvatarPath(storagePath); // This will trigger the useEffect to fetch the signed URL

      // Invalidate the teacher dashboard query to refresh avatar in navbar
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });

      toast({
        title: 'Sikeres feltöltés',
        description: 'Az avatár sikeresen frissítve lett.',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült feltölteni az avatárt.',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
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
      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>Profilképed módosítása</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                {form.getValues('name')?.charAt(0) || <User className="h-12 w-12" />}
              </AvatarFallback>
            </Avatar>
            <Label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </Label>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={uploadingAvatar}
            />
          </div>
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <p className="text-sm font-medium">Profilkép frissítése</p>
            <p className="text-xs text-muted-foreground">
              Kattints a kamera ikonra új kép feltöltéséhez.
              <br />
              Ajánlott: négyzet alakú kép, maximum 5MB.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Személyes adatok</CardTitle>
          <CardDescription>Tanári profil információinak módosítása</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teljes név</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Kovács János" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="school"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Iskola / Intézmény</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Példa Általános Iskola" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bemutatkozás</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Rövid bemutatkozás magadról és a tanítási módszereidről..."
                        rows={4}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {field.value?.length || 0} / 500 karakter
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mentés...
                  </>
                ) : (
                  'Változások mentése'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
