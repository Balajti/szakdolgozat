"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import ParticleButton from "@/components/kokonutui/particle-button";
import { FeatureCard } from "@/components/landing/feature-card";
import { PortalPanel } from "@/components/landing/portal-panel";
import { StepRail } from "@/components/landing/step-rail";
import { StoryPreview } from "@/components/landing/story-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ensureAmplifyConfigured } from "@/lib/api/config";
import { getCurrentUser } from "aws-amplify/auth";

const heroFacts = [
  { value: "A1–C2", label: "nyelvi szintek" },
  { value: "15+", label: "megszerezhető jelvény" },
  { value: "0 Ft", label: "diákoknak és tanároknak" },
];

const studentSteps = [
  {
    title: "Válaszd ki a szinted",
    copy: "Rövid szintfelmérő után a WordNest tudja, hol tartasz — a történetek ehhez igazodnak.",
  },
  {
    title: "Olvass és koppints",
    copy: "Az AI a témádra írja a történetet. Bármelyik ismeretlen szó magyar jelentése egy koppintásra van.",
  },
  {
    title: "Nézd, ahogy nő a szókincsed",
    copy: "Minden megtanult szó bekerül a grafikonodba. Jelvények és napi sorozat tartják a lendületet.",
  },
];

const levelChips = ["A1", "A2", "B1", "B2", "C1", "C2"];
const topicChips = ["Kalandok", "Állatok", "Űr", "Sport", "Rejtélyek"];

export default function Home() {
  useEffect(() => {
    let mounted = true;

    const logCurrentUser = async () => {
      try {
        ensureAmplifyConfigured();
        const currentUser = await getCurrentUser();
        if (!mounted) return;
        console.log("Home: user authenticated", currentUser);
      } catch (error) {
        if (!mounted) return;
        console.log("Home: unauthenticated", error);
      }
    };

    void logCurrentUser();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        {/* Hero — the story reader is the product, so it gets the stage. */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 h-[36rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,122,48,0.16),transparent_70%)]"
          />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 lg:pb-24 lg:pt-20">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="space-y-6 sm:space-y-8"
            >
              <Badge variant="outline" className="w-fit">
                Ingyenes magyar platform
              </Badge>

              <h1 className="font-display text-4xl leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Tanulj angolul{" "}
                <span className="text-primary">varázslatos történeteken</span>{" "}
                keresztül.
              </h1>

              <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                A WordNest AI rövid, életkornak megfelelő sztorikat ír, magyar
                fordításokkal. A diákok játékosan bővítik a szókincsüket, a tanárok
                pedig valós időben látják a fejlődést.
              </p>

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
                <ParticleButton size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/auth/register/role-select">
                    <Sparkles className="size-5" /> Induljon a kaland
                  </Link>
                </ParticleButton>
                <Button variant="ghost" size="lg" className="w-full sm:w-auto" asChild>
                  <Link href="/auth/login">
                    Már van fiókod? <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>

              {/* Plain facts beat dashboard metric cards on a marketing page. */}
              <dl className="flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-border/60 pt-6">
                {heroFacts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="sr-only">{fact.label}</dt>
                    <dd className="font-display text-2xl text-foreground sm:text-3xl">
                      {fact.value}
                    </dd>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      {fact.label}
                    </p>
                  </div>
                ))}
              </dl>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
            >
              <StoryPreview />
            </motion.div>
          </div>
        </section>

        {/* How it works — placed early, because it answers "what is this?" */}
        <section
          id="how"
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
        >
          <div className="mb-10 max-w-2xl space-y-3 sm:mb-14 sm:space-y-4">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Hogyan működik
            </span>
            <h2 className="font-display text-3xl text-foreground sm:text-4xl">
              Három lépés a követhető fejlődéshez.
            </h2>
          </div>
          <StepRail steps={studentSteps} />
        </section>

        {/* Features — one lead tile, three supporting ones. */}
        <section
          id="features"
          className="border-y border-border/50 bg-card/40"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <div className="mb-10 max-w-2xl space-y-3 sm:mb-14 sm:space-y-4">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Miért a WordNest?
              </span>
              <h2 className="font-display text-3xl text-foreground sm:text-4xl">
                Szókincsfejlesztés játékosan, mégis mérhetően.
              </h2>
              <p className="text-base text-muted-foreground sm:text-lg">
                Egyetlen platformon zajlik a történetolvasás, a szókincs gyakorlása
                és az előrehaladás követése — magyar tanulókra szabva.
              </p>
            </div>

            <div className="grid gap-4 sm:gap-5 lg:grid-cols-3">
              <FeatureCard
                tone="feature"
                className="lg:col-span-2"
                icon={<BookOpen className="size-5" />}
                title="AI történetgenerálás"
                description="Válassz szintet és témát, a többit az AI intézi. Percek alatt kapsz friss, korosztályra szabott angol történetet — annyit, amennyit csak akarsz."
                visual={
                  <div className="space-y-3 rounded-2xl border border-primary/20 bg-background/70 p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {levelChips.map((level) => (
                        <span
                          key={level}
                          className={
                            level === "A2"
                              ? "rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
                              : "rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                          }
                        >
                          {level}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {topicChips.map((topic) => (
                        <span
                          key={topic}
                          className={
                            topic === "Kalandok"
                              ? "rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                              : "rounded-lg border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                          }
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                }
              />
              <FeatureCard
                icon={<Brain className="size-5" />}
                title="Szókincs grafikonon"
                description="Ismert és még tanulandó szavak, hétről hétre — látod, mennyit haladtál."
              />
              <FeatureCard
                icon={<Trophy className="size-5" />}
                title="Jelvények és sorozatok"
                description="15+ jelvény és napi olvasási streak, ami visszahozza a diákot holnap is."
              />
              <FeatureCard
                icon={<BarChart3 className="size-5" />}
                title="Tanári analitika"
                description="Osztályszintű és egyéni statisztikák, feladatbeadások és eredmények egy helyen."
              />
              <FeatureCard
                icon={<ShieldCheck className="size-5" />}
                title="Biztonságos gyerekeknek"
                description="AWS Cognito belépés, titkosított adattárolás, GDPR-tudatos működés."
              />
            </div>
          </div>
        </section>

        {/* Two audiences, two visually distinct panels. */}
        <section
          id="portals"
          className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
        >
          <div className="mb-10 max-w-2xl space-y-3 sm:mb-14 sm:space-y-4">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Két portál
            </span>
            <h2 className="font-display text-3xl text-foreground sm:text-4xl">
              Egy platform, két nézőpont.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <PortalPanel
              tone="student"
              eyebrow="Diákoknak"
              title="Varázslatos olvasófelület"
              points={[
                "Történetgenerálás témára és szintre, másodpercek alatt.",
                "Koppintós fordítás és felolvasás minden szónál.",
                "Szókincs-grafikon, jelvények és napi sorozat.",
                "Könyvtár a kedvenc történetek újraolvasásához.",
              ]}
              href="/student"
              cta="Fedezd fel a diák felületet"
            />
            <PortalPanel
              tone="teacher"
              eyebrow="Tanároknak"
              title="Iránymutató irányítópult"
              points={[
                "Egyedi történetek generálása az osztály szintjéhez.",
                "Automatikus kvízek és kiosztható feladatok.",
                "Beadások, eredmények és ranglista egy nézetben.",
                "Részletes analitika a szókincsfejlődésről.",
              ]}
              href="/teacher"
              cta="Nézd meg a tanári felületet"
            />
          </div>
        </section>

        {/* One closing call to action, not three. */}
        <section id="start" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-[2rem] bg-accent px-6 py-12 text-accent-foreground sm:rounded-[2.5rem] sm:px-10 sm:py-16">
            <div className="mx-auto max-w-2xl space-y-6 text-center">
              <h2 className="font-display text-3xl sm:text-4xl">
                Lépj be a WordNest világába.
              </h2>
              <p className="text-base text-accent-foreground/80 sm:text-lg">
                Regisztrálj ingyen, és tapasztald meg, hogyan válik az angoltanulás
                motiváló kalanddá. Nincs bankkártya, nincs előfizetés.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
                <Button variant="default" size="lg" asChild>
                  <Link href="/auth/register?role=student">Diákként kezdem</Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-accent-foreground/30 bg-transparent text-accent-foreground hover:border-accent-foreground/50 hover:bg-accent-foreground/10"
                  asChild
                >
                  <Link href="/auth/register?role=teacher">Tanárként kezdem</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
