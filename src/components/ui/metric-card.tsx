import { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: ReactNode;
  trend?: {
    label: string;
    direction: "up" | "down" | "neutral";
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("overflow-hidden bg-white/90", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-lg font-semibold text-muted-foreground">
            {title}
          </CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {icon ? (
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="flex items-end justify-between">
        <span className="font-display text-4xl font-semibold text-foreground">
          {value}
        </span>
        {trend ? (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold uppercase",
              trend.direction === "up" && "bg-accent/10 text-accent",
              trend.direction === "down" && "bg-destructive/10 text-destructive",
              trend.direction === "neutral" && "bg-muted text-muted-foreground",
            )}
          >
            {trend.label}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
