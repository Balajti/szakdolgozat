"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { fetchAuthSession, fetchUserAttributes, getCurrentUser, signIn as amplifySignIn, signOut as amplifySignOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { ensureAmplifyConfigured } from "@/lib/api/config";
import { useQueryClient } from "@tanstack/react-query";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthUser {
  userId?: string;
  username?: string;
  email?: string | null;
  role?: "student" | "teacher" | null;
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

  const buildUser = useCallback(async (current: Awaited<ReturnType<typeof getCurrentUser>>): Promise<AuthUser> => {
    const withId = current as { userId?: string };
    const withDetails = current as { signInDetails?: { loginId?: string | null } };

    // Fetch user attributes to get the role
    let role: "student" | "teacher" | null = null;
    try {
      const attributes = await fetchUserAttributes();
      const roleAttribute = attributes["custom:role"];
      if (roleAttribute === "student" || roleAttribute === "teacher") {
        role = roleAttribute;
      }
    } catch (error) {
      console.error("Failed to fetch user attributes:", error);
    }

    return {
      userId: withId.userId,
      username: current?.username,
      email: withDetails.signInDetails?.loginId ?? null,
      role,
    };
  }, []);

  const bootstrap = useCallback(async () => {
    setStatus("loading");
    ensureAmplifyConfigured();
    try {
      await fetchAuthSession();
      const current = await getCurrentUser();
      const builtUser = await buildUser(current);
      setUser(builtUser);
      setStatus("authenticated");
      console.log("AuthProvider: user authenticated", builtUser);
    } catch (err) {
      setUser(null);
      setStatus("unauthenticated");
      console.log("AuthProvider: unauthenticated", err);
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
      } else if (event === "tokenRefresh_failure") {
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
