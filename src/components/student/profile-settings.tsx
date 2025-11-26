'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
  name: z.string().min(2, 'A név legalább 2 karakter legyen').max(60, 'Maximum 60 karakter'),
  birthday: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileSettingsProps {
  studentId: string;
}

export function ProfileSettings({ studentId }: ProfileSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      birthday: '',
    },
  });

  const loadProfile = useCallback(async () => {
    try {
      const { client } = await import('@/lib/amplify-client');

      const getProfileQuery = /* GraphQL */ `
        query GetStudentProfile($id: ID!) {
          getStudentProfile(id: $id) {
            id
            name
            birthday
            avatarUrl
          }
        }
      `;

      const response = await client.graphql({
        query: getProfileQuery,
        variables: { id: studentId }
      }) as { data: { getStudentProfile: { name?: string; birthday?: string; avatarUrl?: string } } };

      if (response.data?.getStudentProfile) {
        const profile = response.data.getStudentProfile;
        form.reset({
          name: profile.name || '',
          birthday: profile.birthday || '',
        });
        setAvatarUrl(profile.avatarUrl || null);
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
  }, [studentId, form, toast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      const { client } = await import('@/lib/amplify-client');

      const updateProfileMutation = /* GraphQL */ `
        mutation UpdateStudentProfile($input: UpdateStudentProfileInput!) {
          updateStudentProfile(input: $input) {
            id
            name
            birthday
          }
        }
      `;

      await client.graphql({
        query: updateProfileMutation,
        variables: {
          input: {
            id: studentId,
            name: values.name,
            birthday: values.birthday || null,
          },
        },
      });

      toast({
        title: 'Profil frissítve',
        description: 'Az adataid sikeresen mentve.',
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
        title: 'Érvénytelen fájl',
        description: 'Csak kép fájlokat lehet feltölteni.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Túl nagy fájl',
        description: 'A fájl mérete maximum 5MB lehet.',
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
        path: `avatars/${studentId}/${fileName}`,
        data: file,
        options: {
          contentType: file.type,
        }
      }).result;

      // Get the URL
      const urlResult = await getUrl({ path: result.path });
      const newAvatarUrl = urlResult.url.toString().split('?')[0]; // Remove query params

      // Update profile with new avatar URL
      const updateProfileMutation = /* GraphQL */ `
        mutation UpdateStudentProfile($input: UpdateStudentProfileInput!) {
          updateStudentProfile(input: $input) {
            id
            avatarUrl
          }
        }
      `;

      await client.graphql({
        query: updateProfileMutation,
        variables: {
          input: {
            id: studentId,
            avatarUrl: newAvatarUrl,
          },
        },
      });

      setAvatarUrl(newAvatarUrl);
      toast({
        title: 'Profilkép frissítve',
        description: 'Az új profilképed sikeresen feltöltve.',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Hiba',
        description: 'Nem sikerült feltölteni a profilképet.',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profilkép</CardTitle>
          <CardDescription>
            Tölts fel egy profilképet, hogy személyre szabd a fiókodat.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                {form.watch('name')?.charAt(0) || <User className="h-10 w-10" />}
              </AvatarFallback>
            </Avatar>
            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="avatar-upload" className="cursor-pointer">
              <Button type="button" variant="outline" size="sm" disabled={uploadingAvatar} asChild>
                <span>
                  <Camera className="mr-2 h-4 w-4" />
                  {avatarUrl ? 'Profilkép csere' : 'Profilkép feltöltés'}
                </span>
              </Button>
            </Label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={uploadingAvatar}
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG vagy GIF. Maximum 5MB.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Személyes adatok</CardTitle>
          <CardDescription>
            Frissítsd a neved és születési dátumod.
          </CardDescription>
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
                      <Input placeholder="Vezetéknév Keresztnév" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Születési dátum</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={saving}>
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
