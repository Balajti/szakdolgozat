"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { fetchAuthSession, getCurrentUser, signIn as amplifySignIn, signOut as amplifySignOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { ensureAmplifyConfigured } from "@/lib/api/config";
import { QueryClient, useQueryClient } from "@tanstack/react-query";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthUser {
  userId?: string;
  username?: string;
  email?: string | null;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const buildUser = useCallback((current: Awaited<ReturnType<typeof getCurrentUser>>): AuthUser => {
    return {
      userId: (current as any)?.userId, // Amplify v6 current user shape
      username: current?.username,
      email: (current as any)?.signInDetails?.loginId || null,
    };
  }, []);

  const bootstrap = useCallback(async () => {
    setStatus("loading");
    ensureAmplifyConfigured();
    try {
      await fetchAuthSession();
      const current = await getCurrentUser();
      setUser(buildUser(current));
      setStatus("authenticated");
    } catch (err) {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, [buildUser]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const sub = Hub.listen("auth", ({ payload }) => {
      const { event } = payload;
      if (event === "signedIn") {
        bootstrap();
      } else if (event === "signedOut") {
        setUser(null);
        setStatus("unauthenticated");
        queryClient.clear();
      } else if (event === "sessionExpired") {
        setStatus("unauthenticated");
        setUser(null);
      }
    });
    return () => sub();
  }, [bootstrap, queryClient]);

  const signIn = useCallback(async (username: string, password: string) => {
    ensureAmplifyConfigured();
    await amplifySignIn({ username, password });
    await bootstrap();
  }, [bootstrap]);

  const signOut = useCallback(async () => {
    await amplifySignOut();
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }, [queryClient]);

  const refresh = useCallback(async () => {
    await bootstrap();
  }, [bootstrap]);

  const value: AuthContextValue = {
    status,
    user,
    isAuthenticated: status === "authenticated" && !!user,
    signIn,
    signOut,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
