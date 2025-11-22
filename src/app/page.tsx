"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  ChartBarBig,
  LineChart,
  ShieldCheck,
  Sparkles,
  Users,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 pb-24 pt-16">
        <section className="flex flex-col gap-12 lg:flex-row lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex-1 space-y-8"
          >
            <Badge variant="outline" className="w-fit bg-secondary/40 text-secondary-foreground">
              Ingyenes magyar platform gyerekeknek
            </Badge>
            <h1 className="font-display text-4xl leading-none text-foreground sm:text-5xl lg:text-6xl">
              Tanulj angolul varázslatos történeteken keresztül.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              A WordNest AI rövid, életkornak megfelelő sztorikat készít, magyar fordításokkal.
              A diákok játékosan fejlesztik szókincsüket, a tanárok pedig valós idejű analitikát kapnak.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <ParticleButton className="rounded-2xl px-10 py-5 text-base" asChild>
                <Link href="/auth/register">
                  <Sparkles className="size-5" /> Induljon a kaland
                </Link>
              </ParticleButton>
              <Button variant="ghost" size="lg" asChild>
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
        <div className="grid gap-3 sm:grid-cols-3">
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

        <section id="features" className="space-y-12">
          <div className="flex flex-col items-start gap-4">
            <Badge variant="outline" className="bg-primary/10 text-primary">
              Miért a WordNest?
            </Badge>
            <h2 className="font-display text-3xl text-foreground sm:text-4xl">
              Szókincsfejlesztés játékos, mégis mérhető módon.
            </h2>
            <p className="max-w-3xl text-lg text-muted-foreground">
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

        <section id="ai" className="grid gap-10 rounded-4xl border border-border/40 bg-white/70 p-10 shadow-2xl lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Badge variant="outline" className="bg-accent/20 text-accent">
              AI történetgenerálás
            </Badge>
            <h2 className="font-display text-3xl text-foreground">
              Három prompt, három tanulási mód.
            </h2>
            <Tabs defaultValue="student">
              <TabsList>
                <TabsTrigger value="student">Diák történetek</TabsTrigger>
                <TabsTrigger value="teacher">Tanári feladatok</TabsTrigger>
                <TabsTrigger value="quiz">Kvíz generálás</TabsTrigger>
              </TabsList>
              <TabsContent value="student" className="space-y-4 text-muted-foreground">
                <p>
                  A diák felületén személyre szabott angol történeteket generálhatsz, amelyek a korosztálynak és nyelvtudás szintnek megfelelő szókincset használnak. A rendszer figyelembe veszi a korábban tanult szavakat.
                </p>
                <Card className="border-dashed border-primary/40 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wide text-primary">
                      Funkciók
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    A diák kiválaszthatja a témát (kaland, fantasy, sci-fi, humor), nyelvi szintet (A1-C2), és azonnal generál egy új történetet. A történet olvasása közben kattintással fordíthatja le az ismeretlen szavakat.
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="teacher" className="space-y-4 text-muted-foreground">
                <p>
                  A tanári felületen egyedi feladatokat hozhatsz létre, amelyeket kiosztasz a diákoknak. Megadhatod a témát, nehézségi szintet, és specifikus szavakat is, amelyeket szeretnél, ha a történet tartalmazna.
                </p>
                <Card className="border-dashed border-accent/40 bg-accent/5">
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wide text-accent">
                      Funkciók
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    Hozz létre célzott feladatokat specifikus szókinccsel, oszd ki őket a diákjaidnak, és kövesd nyomon a teljesítményüket. Automatikus kvíz generálás a történethez, átfogó analitika az eredményekről.
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="quiz" className="space-y-4 text-muted-foreground">
                <p>
                  Minden generált történethez automatikusan kvízt készíthetsz, amely teszteli a szövegértést és a szókincset. A kvíz kérdései a történet kulcsfontosságú részeiből generálódnak.
                </p>
                <Card className="border-dashed border-secondary/40 bg-secondary/10">
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wide text-secondary-foreground">
                      Funkciók
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    Az AI automatikusan készít feleletválasztós kérdéseket a történet alapján. A tanár láthatja a diákok válaszait, a helyes/helytelen arányokat, és azonosíthatja a problémás területeket.
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          <div className="space-y-6">
            <h3 className="font-display text-2xl text-foreground">Hogyan működik a platform?</h3>
            <Card className="border-none bg-muted/60">
              <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
                <p>
                  1. A diák bejelentkezik, kiválaszt egy témát és nehézségi szintet, majd az AI azonnal generál egy személyre szabott angol történetet.
                </p>
                <p>
                  2. Olvasás közben az ismeretlen szavakra kattintva magyar fordítást kap, és ezek automatikusan bekerülnek a szótárába.
                </p>
                <p>
                  3. A rendszer nyomon követi a fejlődést: statisztikák, grafikonok, jelvények és napi olvasási sorozatok motiválják a tanulást.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="portals" className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none bg-primary/10 p-8 shadow-2xl">
            <CardHeader className="space-y-4">
              <Badge variant="outline" className="w-fit bg-primary/20 text-primary">
                Diák portál
              </Badge>
              <CardTitle className="font-display text-3xl text-foreground">
                Varázslatos olvasófelület
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <ul className="space-y-3 text-base">
                <li>• Történetgenerálás gombbal: téma, szint, és generálás másodpercek alatt.</li>
                <li>• Szókincsfejlődés grafikon a tanult szavak nyomon követésére.</li>
                <li>• 15+ elérhető jelvény és napi olvasási sorozatok.</li>
                <li>• Könyvtár az elmentett történetek újraolvasásához.</li>
              </ul>
              <Button variant="secondary" asChild>
                <Link href="/student">
                  Fedezd fel a diák felületet <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-none bg-secondary/10 p-8 shadow-2xl">
            <CardHeader className="space-y-4">
              <Badge variant="outline" className="w-fit bg-secondary/40 text-secondary-foreground">
                Tanári portál
              </Badge>
              <CardTitle className="font-display text-3xl text-foreground">
                Iránymutató irányítópult
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-muted-foreground">
              <ul className="space-y-3 text-base">
                {teacherHighlights.map((highlight) => (
                  <li key={highlight.title}>
                    <span className="font-semibold text-foreground">{highlight.title}:</span>
                    <br />
                    {highlight.description}
                  </li>
                ))}
              </ul>
              <Button variant="outline" asChild>
                <Link href="/teacher">
                  Nézd meg a tanári felületet <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-10 rounded-4xl border border-border/40 bg-white/80 p-10 shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <Badge variant="outline" className="bg-primary/15 text-primary">
              Hogyan működik?
            </Badge>
            <h2 className="font-display text-3xl text-foreground">
              3 lépés a követhető fejlődéshez.
            </h2>
            <p className="text-lg text-muted-foreground">
              A WordNest mindent naplóz: a szintfelmérés eredményétől az ismeretlen szavakig. Így a tanár és a diák is látja, hol
              tartanak a tanulásban.
            </p>
          </div>
          <div className="space-y-4">
            {studentSteps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="flex items-start gap-4 rounded-3xl border border-border/50 bg-background/80 p-6 shadow-md"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 font-display text-xl text-primary">
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <h3 className="font-display text-xl text-foreground">{step.title}</h3>
                  <p className="text-base text-muted-foreground">{step.copy}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="pricing" className="rounded-4xl border border-border/40 bg-accent/10 p-10 shadow-2xl">
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <Badge variant="outline" className="bg-accent/30 text-accent">
                WordNest Platform
              </Badge>
              <h2 className="font-display text-3xl text-foreground">
                Teljes körű angoltanulási platform magyar gyerekeknek.
              </h2>
              <p className="text-lg text-muted-foreground">
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

        <section className="rounded-4xl border border-primary/30 bg-primary/95 p-12 text-background shadow-2xl">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <h2 className="font-display text-3xl">Lépj be a WordNest világába</h2>
              <p className="max-w-xl text-background/80">
                Hozd létre a fiókod, és tapasztald meg, hogyan válik az angoltanulás magyar gyerekek számára motiváló kalanddá.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button variant="secondary" size="lg" asChild>
                <Link href="/auth/register?role=student">Diák regisztráció</Link>
              </Button>
              <Button variant="ghost" size="lg" className="text-background" asChild>
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
