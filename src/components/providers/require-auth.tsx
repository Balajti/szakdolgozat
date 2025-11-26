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
  const { status, isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(redirectTo);
    } else if (status === "authenticated" && role && user?.role && user.role !== role) {
      // User is authenticated but has wrong role, redirect to their correct dashboard
      const correctPath = user.role === "student" ? "/student" : "/teacher";
      router.replace(correctPath);
    }
  }, [status, router, redirectTo, role, user?.role]);

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

  // If requiring a specific role and user has wrong role, show loading while redirecting
  if (role && user?.role && user.role !== role) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">Átirányítás…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
