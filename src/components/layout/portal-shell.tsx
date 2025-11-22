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
          "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,122,48,0.22),transparent_50%),radial-gradient(circle_at_85%_15%,rgba(70,92,136,0.18),transparent_46%),radial-gradient(circle_at_40%_85%,rgba(0,0,0,0.12),transparent_48%)]",
          backgroundClassName,
        )}
      />

      <div className="relative mx-auto flex w-full max-w-7xl gap-8 px-4 py-6 lg:px-8">
        <motion.aside
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="hidden w-72 shrink-0 flex-col gap-6 rounded-[2.5rem] border border-transparent bg-gradient-to-b from-accent to-[#2c3854] p-6 text-white shadow-[0_30px_90px_-35px_rgba(0,0,0,0.9)] backdrop-blur-lg lg:flex"
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
          <div className="rounded-[2.75rem] border border-white/60 bg-white/80 p-8 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  );
}
