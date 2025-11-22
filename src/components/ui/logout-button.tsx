"use client";

import { Button, ButtonProps } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LogoutButtonProps extends ButtonProps {
  redirectTo?: string;
}

export function LogoutButton({ className, children, redirectTo = "/auth/login", ...props }: LogoutButtonProps) {
  const { signOut, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signOut();
      router.replace(redirectTo);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} className={className} disabled={loading} {...props}>
      {children || (
        <>
          <LogOut className="mr-2 size-4" /> {loading ? "Kilépés…" : "Kilépés"}
        </>
      )}
    </Button>
  );
}