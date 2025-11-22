"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import ParticleButton from "@/components/kokonutui/particle-button";
import { FeatureCard } from "@/components/landing/feature-card";
import { StoryPreview } from "@/components/landing/story-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { ensureAmplifyConfigured } from "@/lib/api/config";
import { getCurrentUser } from "aws-amplify/auth";

const teacherHighlights = [
  {
    title: "AI történetgenerálás",
    description:
      "Generálj egyedi történeteket percek alatt a diákoknak, különböző szinteken és témákban.",
  },
  {
    title: "Feladatok és kvízek",
    description:
      "Készíts automatikus kvízeket a történetekhez, oszd ki őket a diákoknak és kövesd a teljesítményüket.",
  },
  {
    title: "Analitikai dashboard",
    description:
      "Részletes statisztikák a diákok előrehaladásáról, szókincsfejlődésről és eredményekről.",
  },
];

const studentSteps = [
  {
    title: "Regisztráció és bejelentkezés",
    copy: "Hozd létre a fiókodat diákként, és azonnal hozzáférhetsz a személyre szabott tanulási élményhez.",
  },
  {
    title: "AI történetek olvasása",
    copy: "Generálj és olvass korosztályodnak megfelelő angol történeteket, amelyek fejlesztik a szókincsedet.",
  },
  {
    title: "Fejlődés nyomon követése",
    copy: "Gyűjts jelvényeket, építsd a napi sorozatod, és kövesd a szókincsfejlődésedet vizuális grafikonokon.",
  },
];

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
    <div className="min-h-screen bg-background/80">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-16 pt-8 sm:gap-16 sm:px-6 sm:pb-20 sm:pt-12 lg:gap-24 lg:pb-24 lg:pt-16">
        <section className="flex flex-col gap-8 sm:gap-10 lg:flex-row lg:items-center lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex-1 space-y-5 sm:space-y-6 lg:space-y-8"
          >
            <Badge variant="outline" className="w-fit bg-secondary/40 text-xs text-secondary-foreground sm:text-sm">
              Ingyenes magyar platform gyerekeknek
            </Badge>
            <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl sm:leading-none md:text-5xl lg:text-6xl">
              Tanulj angolul varázslatos történeteken keresztül.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              A WordNest AI rövid, életkornak megfelelő sztorikat készít, magyar fordításokkal.
              A diákok játékosan fejlesztik szókincsüket, a tanárok pedig valós idejű analitikát kapnak.
            </p>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <ParticleButton className="w-full rounded-2xl px-6 py-4 text-sm sm:w-auto sm:px-10 sm:py-5 sm:text-base" asChild>
                <Link href="/auth/register">
                  <Sparkles className="size-5" /> Induljon a kaland
                </Link>
              </ParticleButton>
              <Button variant="ghost" size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/auth/login">
                  Már van fiókod? <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            className="flex-1"
          >
            <StoryPreview />
          </motion.div>
        </section>
        <div className="grid gap-4 sm:grid-cols-3">
              <MetricCard
                title="AI történetek"
                value="Végtelen"
                description="Generálható történetek"
                icon={<BookOpen className="size-6" />}
                trend={{ label: "A1-C2", direction: "neutral" }}
              />
              <MetricCard
                title="Szókincsfejlődés"
                value="Követhető"
                description="Vizuális grafikonokkal"
                icon={<Brain className="size-6" />}
                trend={{ label: "napi", direction: "up" }}
              />
              <MetricCard
                title="Jelvények"
                value="15+"
                description="Elérhető achievement"
                icon={<Sparkles className="size-6" />}
                trend={{ label: "gyűjthető", direction: "neutral" }}
              />
            </div>

        <section id="features" className="space-y-8 sm:space-y-10 lg:space-y-12">
          <div className="flex flex-col items-start gap-3 sm:gap-4">
            <Badge variant="outline" className="bg-primary/10 text-xs text-primary sm:text-sm">
              Miért a WordNest?
            </Badge>
            <h2 className="font-display text-2xl text-foreground sm:text-3xl lg:text-4xl">
              Szókincsfejlesztés játékos, mégis mérhető módon.
            </h2>
            <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
              A WordNest összeköti az AI-t, a pedagógiát és a magyar tanulók igényeit. Egyetlen platformon zajlik a történetolvasás, a szókincs gyakorlása és az előrehaladás követése.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<BookOpen className="size-6" />}
              title="AI történetgenerálás"
              description="Korosztályra szabott angol történetek percek alatt, A1-C2 szinteken, számos témában és stílusban."
            />
            <FeatureCard
              icon={<Brain className="size-6" />}
              title="Szókincsfejlesztés"
              description="Követhető szókincs-előrehaladás vizuális grafikonokon, ismert és ismeretlen szavak nyomon követésével."
              delay={0.05}
            />
            <FeatureCard
              icon={<Sparkles className="size-6" />}
              title="Jelvények és streakek"
              description="Motiváló achievement rendszer 15+ jelvénnyel, napi olvasási sorozatok és fejlődési mérföldkövek."
              delay={0.1}
            />
            <FeatureCard
              icon={<ShieldCheck className="size-6" />}
              title="Biztonságos platform"
              description="AWS Cognito autentikáció, titkosított adattárolás és biztonságos tanulási környezet gyerekeknek."
              delay={0.15}
            />
          </div>
        </section>

        <section id="portals" className="grid gap-6 md:grid-cols-2">
          <Card className="border-none bg-primary/10 p-5 shadow-2xl sm:p-6 lg:p-8">
            <CardHeader className="space-y-2 p-0 pb-4 sm:space-y-3 sm:pb-5">
              <Badge variant="outline" className="w-fit bg-primary/20 text-xs text-primary">
                Diák portál
              </Badge>
              <CardTitle className="font-display text-xl text-foreground sm:text-2xl lg:text-3xl">
                Varázslatos olvasófelület
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-0 text-muted-foreground sm:space-y-5">
              <ul className="space-y-2.5 text-sm leading-relaxed sm:space-y-3 sm:text-base">
                <li>• Történetgenerálás gombbal: téma, szint, és generálás másodpercek alatt.</li>
                <li>• Szókincsfejlődés grafikon a tanult szavak nyomon követésére.</li>
                <li>• 15+ elérhető jelvény és napi olvasási sorozatok.</li>
                <li>• Könyvtár az elmentett történetek újraolvasásához.</li>
              </ul>
              <Button variant="secondary" size="sm" className="w-full sm:w-auto" asChild>
                <Link href="/student">
                  Fedezd fel <span className="hidden sm:inline">a diák felületet</span> <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-none bg-secondary/10 p-5 shadow-2xl sm:p-6 lg:p-8">
            <CardHeader className="space-y-2 p-0 pb-4 sm:space-y-3 sm:pb-5">
              <Badge variant="outline" className="w-fit bg-secondary/40 text-xs text-secondary-foreground">
                Tanári portál
              </Badge>
              <CardTitle className="font-display text-xl text-foreground sm:text-2xl lg:text-3xl">
                Iránymutató irányítópult
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-0 text-muted-foreground sm:space-y-5">
              <ul className="space-y-2.5 text-sm leading-relaxed sm:space-y-3 sm:text-base">
                {teacherHighlights.map((highlight) => (
                  <li key={highlight.title}>
                    <span className="font-semibold text-foreground">{highlight.title}:</span>
                    <br className="hidden sm:block" />
                    <span className="sm:hidden"> </span>
                    {highlight.description}
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                <Link href="/teacher">
                  Nézd meg <span className="hidden sm:inline">a tanári felületet</span> <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 rounded-3xl border border-border/40 bg-white/80 p-6 shadow-2xl sm:gap-8 sm:rounded-4xl sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 lg:p-10">
          <div className="space-y-3 sm:space-y-4">
            <Badge variant="outline" className="bg-primary/15 text-xs text-primary sm:text-sm">
              Hogyan működik?
            </Badge>
            <h2 className="font-display text-2xl text-foreground sm:text-3xl">
              3 lépés a követhető fejlődéshez.
            </h2>
            <p className="text-base text-muted-foreground sm:text-lg">
              A WordNest mindent naplóz: a szintfelmérés eredményétől az ismeretlen szavakig. Így a tanár és a diák is látja, hol
              tartanak a tanulásban.
            </p>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {studentSteps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/80 p-4 shadow-md sm:gap-4 sm:rounded-3xl sm:p-6"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display text-lg text-primary sm:size-12 sm:rounded-2xl sm:text-xl">
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <h3 className="font-display text-lg text-foreground sm:text-xl">{step.title}</h3>
                  <p className="text-sm text-muted-foreground sm:text-base">{step.copy}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="pricing" className="rounded-3xl border border-border/40 bg-accent/10 p-6 shadow-2xl sm:rounded-4xl sm:p-8 lg:p-10">
          <div className="grid gap-6 sm:gap-8 md:grid-cols-[1.1fr_0.9fr] lg:gap-10">
            <div className="space-y-3 sm:space-y-4">
              <Badge variant="outline" className="bg-accent/30 text-xs text-accent sm:text-sm">
                WordNest Platform
              </Badge>
              <h2 className="font-display text-2xl text-foreground sm:text-3xl">
                Teljes körű angoltanulási platform magyar gyerekeknek.
              </h2>
              <p className="text-base text-muted-foreground sm:text-lg">
                A WordNest egyesíti az AI történetgenerálást, a szókincsfejlesztést és a fejlődés nyomon követését egyetlen platformon. Diákoknak és tanároknak egyaránt.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <Badge variant="default">AI történetgenerálás</Badge>
                <Badge variant="default">Szókincsfejlesztés</Badge>
                <Badge variant="default">Jelvények & Streakek</Badge>
                <Badge variant="default">Analitikai dashboard</Badge>
              </div>
            </div>
            <Card className="border-none bg-white/90 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">
                  Kezdj el tanárokként
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <ol className="list-decimal space-y-3 pl-5">
                  <li>Regisztrálj tanári fiókkal a platformra.</li>
                  <li>Generálj AI történeteket és készíts feladatokat.</li>
                  <li>Oszd ki a feladatokat a diákjaidnak.</li>
                  <li>Kövesd nyomon az eredményeket az analitikai dashboardon.</li>
                </ol>
                <Button variant="gradient" asChild>
                  <Link href="/auth/register?role=teacher">
                    Tanári regisztráció
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-3xl border border-primary/30 bg-primary/95 p-6 text-background shadow-2xl sm:rounded-4xl sm:p-8 lg:p-12">
          <div className="flex flex-col items-start gap-5 sm:gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3 sm:space-y-4">
              <h2 className="font-display text-2xl sm:text-3xl">Lépj be a WordNest világába</h2>
              <p className="max-w-xl text-sm text-background/80 sm:text-base">
                Hozd létre a fiókod, és tapasztald meg, hogyan válik az angoltanulás magyar gyerekek számára motiváló kalanddá.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-4">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/auth/register?role=student">Diák regisztráció</Link>
              </Button>
              <Button variant="ghost" size="lg" className="w-full text-background sm:w-auto" asChild>
                <Link href="/auth/register?role=teacher">Tanári regisztráció</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
