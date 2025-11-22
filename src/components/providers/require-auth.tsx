"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Loader2 } from "lucide-react";

interface RequireAuthProps {
  children: ReactNode;
  redirectTo?: string;
  role?: "student" | "teacher" | "admin";
}

export function RequireAuth({ children, redirectTo = "/auth/login", role }: RequireAuthProps) {
  const { status, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(redirectTo);
    }
  }, [status, router, redirectTo]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">Bejelentkezés ellenőrzése…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
