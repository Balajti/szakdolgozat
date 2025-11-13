"use client";

import { ReactNode, useEffect } from "react";
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  type DehydratedState,
} from "@tanstack/react-query";
import { useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./auth-provider";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

interface AppProvidersProps {
  children: ReactNode;
  dehydratedState?: unknown;
}

export function AppProviders({ children, dehydratedState }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: "wordnest-rq-cache",
      throttleTime: 1000,
    });
    persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 12, // 12h
      buster: "v1",
    });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState as DehydratedState | undefined}>
        <TooltipProvider delayDuration={120}>
          <AuthProvider>{children}</AuthProvider>
        </TooltipProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
