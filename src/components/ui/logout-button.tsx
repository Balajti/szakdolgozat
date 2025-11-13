"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton({ className }: { className?: string }) {
  const { signOut, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await signOut();
      router.replace("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} className={className} disabled={loading}>
      <LogOut className="mr-2 size-4" /> {loading ? "Kilépés…" : "Kilépés"}
    </Button>
  );
}