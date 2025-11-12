import { BookOpenCheck } from "lucide-react";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function Logo({ size = "md", className }: LogoProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 font-display font-semibold text-primary",
        sizeMap[size],
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <BookOpenCheck className="size-5" />
      </span>
      <div className="leading-tight text-left text-foreground">
        <span className="block">WordNest</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Learn English Through Stories
        </span>
      </div>
    </div>
  );
}
