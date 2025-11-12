"use client";

import { ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/logo";

interface PortalShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  topActions?: ReactNode;
  backgroundClassName?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function PortalShell({
  sidebar,
  children,
  topActions,
  backgroundClassName,
  backHref = "/",
  backLabel = "Vissza a kezdőlapra",
  className,
}: PortalShellProps) {
  return (
    <div className={cn("relative min-h-screen bg-background", className)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.15),transparent_45%),radial-gradient(circle_at_85%_30%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(250,204,21,0.14),transparent_45%)]",
          backgroundClassName,
        )}
      />

      <div className="relative mx-auto flex w-full max-w-7xl gap-8 px-4 py-6 lg:px-8">
        <motion.aside
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="hidden w-72 shrink-0 flex-col gap-6 rounded-3xl border border-border/60 bg-white/80 p-6 shadow-xl backdrop-blur-lg lg:flex"
        >
          <Link href="/" className="flex items-center gap-3">
            <Logo size="sm" />
          </Link>
          {sidebar}
        </motion.aside>

        <motion.main
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ damping: 20, stiffness: 180 }}
          className="flex flex-1 flex-col gap-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href={backHref}>
                <ChevronLeft className="size-4" /> {backLabel}
              </Link>
            </Button>
            {topActions}
          </div>
          <div className="rounded-3xl border border-border/40 bg-white/80 p-6 shadow-xl backdrop-blur">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  );
}
