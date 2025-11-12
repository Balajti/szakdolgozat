import Link from "next/link";
import { Mail, Sparkles } from "lucide-react";

import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-gradient-to-t from-primary/5 via-background to-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-md space-y-4">
            <Logo size="lg" />
            <p className="text-base text-muted-foreground">
              WordNest playful módon segíti a magyar diákokat az angol szókincs
              fejlesztésében. AI által generált történetek, magyar fordítások és
              átlátható tanári analitikák egyetlen platformon.
            </p>
            <Button variant="gradient" className="w-fit" asChild>
              <Link href="/auth/register">
                <Sparkles className="size-4" /> Regisztráció
              </Link>
            </Button>
          </div>

          <div className="grid flex-1 gap-6 sm:grid-cols-3">
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Platform
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link className="hover:text-primary" href="/#features">
                    Funkciók
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-primary" href="/#ai">
                    AI történetek
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-primary" href="/#portals">
                    Portálok
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Segítség
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <Link className="hover:text-primary" href="/docs/teachers">
                    Tanári útmutató
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-primary" href="/docs/students">
                    Diák útmutató
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-primary" href="/docs/privacy">
                    Adatvédelem
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Kapcsolat
              </h3>
              <p className="text-sm text-muted-foreground">
                Kérdéseid vannak? Vedd fel velünk a kapcsolatot!
              </p>
              <Button variant="outline" className="group w-fit" asChild>
                <Link href="mailto:hello@wordnest.hu">
                  <Mail className="size-4 text-primary transition-transform group-hover:-translate-y-0.5" />
                  hello@wordnest.hu
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <Separator className="border-border/40" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} WordNest. Minden jog fenntartva.</p>
          <div className="flex items-center gap-4">
            <Link className="hover:text-primary" href="/docs/terms">
              Felhasználási feltételek
            </Link>
            <Link className="hover:text-primary" href="/docs/privacy">
              Adatkezelés & GDPR
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
