import { useState, useCallback } from 'react';

type ToastVariant = 'default' | 'destructive' | 'success';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface Toast extends ToastOptions {
  id: string;
  open: boolean;
}

// Simple toast implementation
// For production, consider using a library like sonner or radix-ui toast
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = {
      ...options,
      id,
      open: true,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after duration (default 3 seconds)
    const duration = options.duration ?? 3000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    // For now, use browser alert for visibility
    // Replace with proper toast UI component in production
    if (options.variant === 'destructive') {
      console.error(`${options.title}: ${options.description}`);
    } else {
      console.log(`${options.title}: ${options.description}`);
    }
  }, []);

  const dismiss = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
}
