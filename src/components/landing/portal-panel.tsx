import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PortalPanelProps {
  eyebrow: string;
  title: string;
  points: string[];
  href: string;
  cta: string;
  tone: "student" | "teacher";
}

export function PortalPanel({
  eyebrow,
  title,
  points,
  href,
  cta,
  tone,
}: PortalPanelProps) {
  const isStudent = tone === "student";

  return (
    <div
      className={cn(
        "flex flex-col gap-6 rounded-[2rem] border p-6 sm:p-8",
        isStudent
          ? "border-primary/25 bg-primary/[0.07]"
          : "border-accent/25 bg-accent/[0.07]",
      )}
    >
      <div className="space-y-2">
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.14em]",
            isStudent ? "text-primary" : "text-accent",
          )}
        >
          {eyebrow}
        </span>
        <h3 className="font-display text-2xl text-foreground sm:text-3xl">
          {title}
        </h3>
      </div>

      <ul className="flex-1 space-y-3">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-3 text-sm text-muted-foreground sm:text-base">
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                isStudent
                  ? "bg-primary/15 text-primary"
                  : "bg-accent/15 text-accent",
              )}
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
            {point}
          </li>
        ))}
      </ul>

      <Button
        variant={isStudent ? "default" : "outline"}
        size="sm"
        className="w-full sm:w-fit"
        asChild
      >
        <Link href={href}>
          {cta} <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
