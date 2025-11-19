import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";

import "../globals.css";

export const metadata: Metadata = {
  title: "WordNest • Bejelentkezés és regisztráció",
  description:
    "Hozz létre WordNest fiókot diákként vagy tanárként, és kezdd el az angoltanulást személyre szabott történetekkel.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background/95 lg:grid-cols-[1fr_1fr]">
      <div className="relative hidden bg-gradient-to-br from-primary via-accent to-secondary text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_45%),radial-gradient(circle_at_80%_40%,rgba(255,255,255,0.22),transparent_50%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div className="flex flex-col justify-start gap-20">
            <header className="space-y-3">
              <Link href="/" className="flex items-center gap-3 text-white/90">
                <span className="flex size-12 items-center justify-center rounded-3xl bg-white/15">
                  <Sparkles className="size-6" />
                </span>
                <div>
                  <p className="font-display text-3xl">WordNest</p>
                  <p className="text-sm uppercase tracking-widest">Learn English Through Stories</p>
                </div>
              </Link>
            </header>
            <div className="space-y-6">
              <h2 className="font-display text-4xl leading-tight text-white">
                Olvass, tanulj, fejlődj – magyar fordításokkal.
              </h2>
              <p className="text-lg text-white/80">
                A WordNest segít a magyar diákoknak új angol szavakat tanulni AI által generált, korosztályos történetekkel.
                A tanárok valós idejű visszajelzést kapnak a szókincselakadásokhoz.
              </p>
              <div className="rounded-3xl bg-white/20 p-6 backdrop-blur">
                <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-white">
                  <BookOpen className="size-5" /> Mit kapsz?
                </p>
                <ul className="mt-4 space-y-2 text-white/85">
                  <li>• AI történetek magyar magyarázatokkal</li>
                  <li>• Interaktív szótár és „Nem tudom” gomb</li>
                  <li>• Tanári meghívók, osztályok és analitikák</li>
                </ul>
              </div>
            </div>
          </div>
          <footer className="text-sm text-white/70">
            © {new Date().getFullYear()} WordNest. Minden jog fenntartva.
          </footer>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="flex w-full max-w-md flex-col gap-8">
          {children}
        </div>
      </div>
    </div>
  );
}
