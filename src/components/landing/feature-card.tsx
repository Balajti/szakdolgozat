import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** Optional illustration rendered under the copy in the wide bento tile. */
  visual?: ReactNode;
  tone?: "default" | "feature";
  className?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  visual,
  tone = "default",
  className,
}: FeatureCardProps) {
  const isFeature = tone === "feature";

  return (
    <div
      className={cn(
        "group flex h-full flex-col gap-4 rounded-3xl border p-6 transition-colors sm:p-7",
        isFeature
          ? "border-primary/25 bg-primary/[0.07] hover:border-primary/40"
          : "border-border/60 bg-card hover:border-primary/30",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-2xl transition-transform group-hover:-translate-y-0.5",
          isFeature
            ? "bg-primary text-primary-foreground"
            : "bg-primary/10 text-primary",
        )}
      >
        {icon}
      </span>

      <div className="space-y-2">
        <h3
          className={cn(
            "font-display text-foreground",
            isFeature ? "text-xl sm:text-2xl" : "text-lg",
          )}
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>

      {visual ? <div className="mt-auto pt-2">{visual}</div> : null}
    </div>
  );
}
