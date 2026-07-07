"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorCardProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  /** Center the card vertically in the viewport (for full-page errors). */
  fullPage?: boolean;
}

/**
 * Standard error state: message + retry button. Use instead of a toast with a
 * blank screen so the user always has a way forward.
 */
export function ErrorCard({
  title = "Hoppá, hiba történt",
  description = "Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatod, majd próbáld újra.",
  onRetry,
  retryLabel = "Újrapróbálás",
  className,
  fullPage = false,
}: ErrorCardProps) {
  const card = (
    <Card className={cn("max-w-md w-full border-destructive/30", className)}>
      <CardContent className="p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {onRetry ? (
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {retryLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        {card}
      </div>
    );
  }

  return card;
}
