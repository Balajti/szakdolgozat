import { useState, useEffect } from 'react';

/**
 * Custom hook to fetch a signed URL for an avatar stored in Amplify Storage
 * @param avatarPath - The storage path (e.g., "avatars/123/file.png")
 * @returns The signed URL or null if not available
 */
export function useAvatarUrl(avatarPath: string | null | undefined): string | null {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchSignedUrl = async () => {
            if (!avatarPath) {
                setAvatarUrl(null);
                return;
            }

            try {
                const { getUrl } = await import('aws-amplify/storage');
                const urlResult = await getUrl({ path: avatarPath });
                setAvatarUrl(urlResult.url.toString());
            } catch (error) {
                console.error('Error fetching signed avatar URL:', error);
                setAvatarUrl(null);
            }
        };

        fetchSignedUrl();
    }, [avatarPath]);

    return avatarUrl;
}
