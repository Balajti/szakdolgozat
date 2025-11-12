"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { LogIn, Sparkles } from "lucide-react";

import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/#features", label: "Funkciók" },
  { href: "/#ai", label: "AI történetek" },
  { href: "/#portals", label: "Portálok" },
  { href: "/#pricing", label: "Ingyenes" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 bg-gradient-to-b from-background/95 via-background/80 to-background/40 backdrop-blur-lg"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="transition-transform hover:scale-[1.02]">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/auth/login">
              <LogIn className="size-4" /> Belépés
            </Link>
          </Button>
          <Button variant="gradient" size="sm" asChild>
            <Link href={pathname?.startsWith("/teacher") ? "/auth/register?role=teacher" : "/auth/register"}>
              <Sparkles className="size-4" /> Kezdjük!
            </Link>
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
