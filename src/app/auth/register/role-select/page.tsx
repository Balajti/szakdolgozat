"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, GraduationCap, BookOpen, Users, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RoleSelectPage() {
    const router = useRouter();

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
                <ArrowLeft className="size-4" />
                Vissza a főoldalra
            </Link>

            <div className="space-y-4 text-center">
                <Badge variant="outline" className="w-fit mx-auto bg-primary/10 text-primary">
                    Új WordNest fiók
                </Badge>
                <h1 className="font-display text-3xl text-foreground">
                    Válaszd ki a szerepköröd
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    A WordNest diákoknak és tanároknak egyaránt elérhető. Válaszd ki, hogy melyik szerepkörben szeretnél regisztrálni.
                </p>
            </div>

            <div className="grid md:grid-cols-1 gap-6 mt-8">
                {/* Student Card */}
                <Card className="border-2 hover:border-primary/50 transition-all cursor-pointer group md:col-span-1" onClick={() => router.push('/auth/register?role=student')}>
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-4 rounded-2xl bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
                            <GraduationCap className="h-12 w-12 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Diák vagyok</CardTitle>
                        <CardDescription className="text-base">
                            Tanulj angolul élményalapú történetekkel
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-start gap-3">
                                <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <span>Személyre szabott angol történetek az életkorodnak megfelelően</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Target className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <span>Interaktív szókincs fejlesztés magyar fordításokkal</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <span>Kövesd a fejlődésed és szerezz jelvényeket</span>
                            </li>
                        </ul>
                        <Button className="w-full mt-6" size="lg">
                            Regisztráció diákként
                        </Button>
                    </CardContent>
                </Card>

                {/* Teacher Card */}
                <Card className="border-2 hover:border-accent/50 transition-all cursor-pointer group md:col-span-1" onClick={() => router.push('/auth/register?role=teacher')}>
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-4 rounded-2xl bg-accent/10 w-fit group-hover:bg-accent/20 transition-colors">
                            <Users className="h-12 w-12 text-accent" />
                        </div>
                        <CardTitle className="text-2xl">Tanár vagyok</CardTitle>
                        <CardDescription className="text-base">
                            Kezeld az osztályod és kövesd a diákok haladását
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-start gap-3">
                                <Users className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                                <span>Hívj meg diákokat és szervezz osztályokat</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <Target className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                                <span>Készíts személyre szabott feladatokat AI segítségével</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <BookOpen className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                                <span>Valós idejű analitika a diákok fejlődéséről</span>
                            </li>
                        </ul>
                        <Button className="w-full mt-6" size="lg" variant="secondary">
                            Regisztráció tanárként
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-3xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground text-center">
                Már van fiókod?{" "}
                <Link href="/auth/login" className="font-semibold text-primary">
                    Jelentkezz be itt.
                </Link>
            </div>
        </motion.div>
    );
}
