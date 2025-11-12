"use client";

import { ReactNode } from "react";
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  type DehydratedState,
} from "@tanstack/react-query";
import { useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

interface AppProvidersProps {
  children: ReactNode;
  dehydratedState?: unknown;
}

export function AppProviders({ children, dehydratedState }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState as DehydratedState | undefined}>
        <TooltipProvider delayDuration={120}>
          {children}
        </TooltipProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
