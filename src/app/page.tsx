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
    title: "Okos osztálykezelés",
    description:
      "Hívd meg a diákokat e-mailben, rendelj hozzájuk szintfelmérést, és kövesd a szókincs fejlődését egyetlen felületről.",
  },
  {
    title: "Sztori generátor",
    description:
      "Adj meg kötelező vagy tiltott szavakat, válaszd ki a szintet, és percek alatt készül el az óravázlatod.",
  },
  {
    title: "Valós idejű analitika",
    description:
      "Táblázatok, grafikonok és jelentések mutatják meg, hol akadnak el a tanulók és milyen szavak okoznak nehézséget.",
  },
];

const studentSteps = [
  {
    title: "Regisztráció és szintfelmérés",
    copy: "Születési dátum alapján személyre szabott A1 teszt vár, amely felméri az induló szintet.",
  },
  {
    title: "Személyre szabott történetek",
    copy: "A WordNest rövid, játékos történeteket készít a szintedhez igazodva, 5-10% új szókinccsel.",
  },
  {
    title: "Szókincs építése",
    copy: "Az ismeretlen szavak egy kattintással a saját szótáradba kerülnek, magyar magyarázattal és példamondattal.",
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
                title="Olvasási sorozat"
                value="5 nap"
                description="Átlagos diák aktivitás"
                icon={<LineChart className="size-6" />}
                trend={{ label: "+18%", direction: "up" }}
              />
              <MetricCard
                title="Új szavak"
                value="1 200+"
                description="Magyar fordítással"
                icon={<Brain className="size-6" />}
                trend={{ label: "havonta", direction: "neutral" }}
              />
              <MetricCard
                title="Tanári osztályok"
                value="160"
                description="Aktív WordNest csoport"
                icon={<Users className="size-6" />}
                trend={{ label: "+6 új", direction: "up" }}
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
              title="Korosztályos történetek"
              description="A születési dátum alapján korosztályra szabott sztorik érkeznek. Rövid mondatok, egyszerű nyelvtan, közben 5-10% új szó."
            />
            <FeatureCard
              icon={<ShieldCheck className="size-6" />}
              title="Biztonságos tanulás"
              description="Cognito védi a fiókokat, a DynamoDB tárolja a fejlődési adatokat, és minden érzékeny információ titkosított."
              delay={0.05}
            />
            <FeatureCard
              icon={<ChartBarBig className="size-6" />}
              title="Valós idejű analitika"
              description="A WordNest részletes jelentéseket készít a tanulók erősségeiről és elakadásairól, így a tanár gyorsan reagálhat."
              delay={0.1}
            />
            <FeatureCard
              icon={<Sparkles className="size-6" />}
              title="Magyar fordítás egy kattintásra"
              description="Glosbe API + dictionaryapi.dev biztosítja a megbízható magyar jelentést és példamondatot minden nehezebb szóra."
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
            <Tabs defaultValue="personalized">
              <TabsList>
                <TabsTrigger value="placement">Szintfelmérés</TabsTrigger>
                <TabsTrigger value="personalized">Személyre szabott</TabsTrigger>
                <TabsTrigger value="teacher">Tanári</TabsTrigger>
              </TabsList>
              <TabsContent value="placement" className="space-y-4 text-muted-foreground">
                <p>
                  80 szóból álló A1 történet. Maximum 8 szó/mondat, egyszerű igeidők, vegyes könnyű és közepesen nehéz szavak.
                  A diák jelzi, mit nem ért – ezek azonnal bekerülnek a tanulási listába.
                </p>
                <Card className="border-dashed border-primary/40 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wide text-primary">
                      Prompt részlet
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    Generate an 80-word A1 English story for a Hungarian 9-year-old learner. Use only short sentences (max 8 words). Blend basic and slightly harder vocabulary. Finish with an encouraging question.
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="personalized" className="space-y-4 text-muted-foreground">
                <p>
                  A mindenkori CEFR szintet tartja, de 5-10% új szót alkalmaz az ismeretlen listából. Segít finoman tágítani a
                  szókincset, miközben motiváló történetet mesél.
                </p>
                <Card className="border-dashed border-accent/40 bg-accent/5">
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wide text-accent">
                      Prompt részlet
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    Create a contextual story for a {"{level}"} learner aged {"{age}"}. Use mostly known words from the provided list and inject 5-10% new vocabulary drawn from unknownWords. Keep sentences short and grammar simple.
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="teacher" className="space-y-4 text-muted-foreground">
                <p>
                  A tanári felületen egy 100-200 szavas, célnyelvi témájú történet készül. Egyaránt kezeli a kötelező és tiltott
                  szavakat, így könnyen illeszkedik az óratervhez.
                </p>
                <Card className="border-dashed border-secondary/40 bg-secondary/10">
                  <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wide text-secondary-foreground">
                      Prompt részlet
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    Generate a 120-word story for {"{level}"} learners aged {"{age}"}. Include all requiredWords and exclude forbiddenWords. Maintain an encouraging tone and ensure vocabulary appears multiple times in context.
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          <div className="space-y-6">
            <h3 className="font-display text-2xl text-foreground">Hogyan érkezik a fordítás?</h3>
            <Card className="border-none bg-muted/60">
              <CardContent className="space-y-4 p-6 text-sm text-muted-foreground">
                <p>
                  1. A WordNest először lekéri a Glosbe EN→HU fordítást. Ha nem érkezik találat, automatikusan használja a dictionaryapi.dev szolgáltatást.
                </p>
                <p>
                  2. Az eredményhez példamondatot generál az AI, egyszerű igeidőkkel, magyar magyarázattal.
                </p>
                <p>
                  3. A diák egy kattintással elmentheti a szót „Ismeretlen” státusszal. A tanár a későbbi jelentésekben látja a gyakori nehézségeket.
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
                <li>• Minimalista olvasó mód, ahol a fókusz a történeten van.</li>
                <li>• Tooltip fordítások, „Nem tudom” gomb a szó rögzítéséhez.</li>
                <li>• Oldalsáv szótár mentett szavakkal, magyar példamondatokkal.</li>
                <li>• Napi streak, jelvények és fejlődési grafikonok.</li>
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
                Ingyenes bevezető időszak
              </Badge>
              <h2 className="font-display text-3xl text-foreground">
                WordNest 2025-ben minden magyar iskola számára elérhető.
              </h2>
              <p className="text-lg text-muted-foreground">
                A platform teljes funkcionalitása (AI-történetek, statisztikák, meghívók) ingyenes marad a public beta alatt. Későbbi fizetős funkcióink a tanárok adminisztrációját segítik majd – a diákoknak mindig díjmentes lesz.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <Badge variant="default">S3 történet cache</Badge>
                <Badge variant="default">AppSync GraphQL</Badge>
                <Badge variant="default">Cognito meghívók</Badge>
                <Badge variant="default">DynamoDB statisztikák</Badge>
              </div>
            </div>
            <Card className="border-none bg-white/90 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-foreground">
                  Első lépések tanároknak
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <ol className="list-decimal space-y-3 pl-5">
                  <li>Regisztrálj tanárként, és adj meg egy iskolai e-mail címet.</li>
                  <li>Hívd meg a diákokat meghívó linkkel vagy e-mail küldéssel.</li>
                  <li>Készíts szókincses történetet, majd küldd ki feladatként.</li>
                  <li>Ellenőrizd a beérkező megoldásokat az analitikai nézetben.</li>
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
