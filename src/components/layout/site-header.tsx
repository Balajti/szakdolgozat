"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, LogIn, Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { LogoutButton } from "@/components/ui/logout-button";
import { useAuth } from "@/components/providers/auth-provider";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { isAuthenticated } = useAuth();
  const dashboardHref = pathname?.startsWith("/teacher") ? "/teacher" : "/student";

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 bg-gradient-to-b from-background/95 via-background/80 to-background/40 backdrop-blur-lg"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
        <Link href="/" className="transition-transform hover:scale-[1.02]">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
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

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Button variant="secondary" size="sm" className="hidden rounded-full px-5 sm:inline-flex" asChild>
                <Link href={dashboardHref}>
                  Vezérlőpult <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <div className="hidden sm:block">
                <LogoutButton />
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
                <Link href="/auth/login">
                  <LogIn className="size-4" /> Belépés
                </Link>
              </Button>
              <Button variant="gradient" size="sm" className="hidden text-xs sm:inline-flex sm:text-sm" asChild>
                <Link href={pathname?.startsWith("/teacher") ? "/auth/register?role=teacher" : "/auth/register"}>
                  <Sparkles className="size-4" /> Kezdjük!
                </Link>
              </Button>
            </>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/50 bg-background/95 backdrop-blur-lg lg:hidden"
          >
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
              
              <div className="mt-2 flex flex-col gap-2 border-t border-border/50 pt-3">
                {isAuthenticated ? (
                  <>
                    <Button variant="secondary" size="sm" className="w-full justify-start" asChild>
                      <Link href={dashboardHref} onClick={() => setIsMobileMenuOpen(false)}>
                        <ArrowRight className="size-4" /> Vezérlőpult
                      </Link>
                    </Button>
                    <LogoutButton />
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                      <Link href="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                        <LogIn className="size-4" /> Belépés
                      </Link>
                    </Button>
                    <Button variant="gradient" size="sm" className="w-full justify-start" asChild>
                      <Link
                        href={pathname?.startsWith("/teacher") ? "/auth/register?role=teacher" : "/auth/register"}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Sparkles className="size-4" /> Kezdjük!
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
