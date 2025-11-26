'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAvatarUrl } from '@/hooks/use-avatar-url';
import { ReactNode } from 'react';

interface S3AvatarProps {
    /** S3 storage path (e.g., "avatars/123/file.png") */
    avatarPath?: string | null;
    /** Fallback content to display when no avatar */
    fallback: ReactNode;
    /** Additional className for the Avatar container */
    className?: string;
}

/**
 * Avatar component that automatically fetches signed URLs from S3 storage paths
 */
export function S3Avatar({ avatarPath, fallback, className }: S3AvatarProps) {
    const avatarUrl = useAvatarUrl(avatarPath);

    return (
        <Avatar className={className}>
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
    );
}
