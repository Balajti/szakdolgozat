"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Suspense, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CalendarDays, Loader2, Lock, Mail, Sparkles, UserPlus } from "lucide-react";

import {
  registerSchema,
  type RegisterInput,
  mockRegisterUser,
} from "@/lib/auth-client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const preselectedRole = (searchParams.get("role") as RegisterInput["role"]) ?? "student";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      birthday: "",
      role: preselectedRole,
      fullName: "",
  teacherBio: "",
    },
  });

  useEffect(() => {
    form.setValue("role", preselectedRole);
  }, [form, preselectedRole]);

  const onSubmit = async (values: RegisterInput) => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      await mockRegisterUser(values);
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setErrorMessage("Hiba történt a regisztráció során. Próbáld újra később.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="space-y-4 text-left">
        <Badge variant="outline" className="w-fit bg-primary/10 text-primary">
          Új WordNest fiók
        </Badge>
        <h1 className="font-display text-3xl text-foreground">
          Regisztráció diákoknak és tanároknak
        </h1>
        <p className="text-muted-foreground">
          Hozd létre a fiókod, hogy élményalapú, magyar fordításokkal ellátott angol történeteket kapj. A tanárok diákokat is
          meghívhatnak és valós idejű analitikát érhetnek el.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Szerepkör</FormLabel>
                <Tabs value={field.value} onValueChange={(value) => field.onChange(value)} className="w-full">
                  <TabsList className="grid grid-cols-2 rounded-2xl bg-muted/60 p-1">
                    <TabsTrigger value="student" className="rounded-xl">
                      Diák vagyok
                    </TabsTrigger>
                    <TabsTrigger value="teacher" className="rounded-xl">
                      Tanár vagyok
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="student" className="space-y-2 rounded-3xl border border-border/60 bg-white/80 p-4 text-sm text-muted-foreground">
                    A történetek a születési dátum alapján életkornak megfelelően készülnek.
                  </TabsContent>
                  <TabsContent value="teacher" className="space-y-2 rounded-3xl border border-border/60 bg-white/80 p-4 text-sm text-muted-foreground">
                    Ha tanár vagy, meghívhatod a diákokat e-mailen és nyomon követheted a fejlődésüket.
                  </TabsContent>
                </Tabs>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teljes név</FormLabel>
                  <FormControl>
                    <Input placeholder="Kiss Anna" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail cím</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="te@iskola.hu" autoComplete="email" prefixIcon={<Mail className="size-4" />} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jelszó</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Erős jelszó"
                        autoComplete="new-password"
                        prefixIcon={<Lock className="size-4" />}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Legalább 8 karakter, kis- és nagybetű, valamint szám szükséges.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jelszó megerősítése</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Írd be újra" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="birthday"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Születési dátum</FormLabel>
                  <FormControl>
                    <Input type="date" prefixIcon={<CalendarDays className="size-4" />} {...field} />
                  </FormControl>
                  <FormDescription>
                    Ennek alapján állítjuk be az induló sztorik életkori szintjét.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("role") === "teacher" ? (
              <FormField
                control={form.control}
                name="teacherBio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanári bemutatkozás (opcionális)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Mutasd be röviden az osztályod vagy az iskoládat."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A tanári profil későbbi bővítéséhez használjuk, nem kötelező.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </div>

          {status === "success" ? (
            <Alert variant="success" title="Sikeres regisztráció">
              A megadott e-mail címre hamarosan egy megerősítő üzenetet küldünk. Lépj be, és próbáld ki az első történetet!
            </Alert>
          ) : null}

          {status === "error" && errorMessage ? (
            <Alert variant="destructive" title="Hoppá, hiba történt" description={errorMessage} />
          ) : null}

          <Button type="submit" size="lg" variant="gradient" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? <Loader2 className="mr-2 size-5 animate-spin" /> : <UserPlus className="mr-2 size-5" />} Regisztráció
          </Button>
        </form>
      </Form>

      <div className="rounded-3xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
        Már van fiókod?{" "}
        <Link href="/auth/login" className="font-semibold text-primary">
          Jelentkezz be itt.
        </Link>
      </div>

      <div className="space-y-3 rounded-3xl border border-primary/40 bg-primary/5 p-5 text-sm text-primary">
        <p className="flex items-center gap-2 font-semibold text-primary">
          <Sparkles className="size-4" /> Mi történik ezután?
        </p>
        <ul className="space-y-1 text-primary/90">
          <li>1. Elküldjük a szintfelmérőt A1 szinten, rövid mondatokkal.</li>
          <li>2. A megjelölt ismeretlen szavak bekerülnek a szótáradba.</li>
          <li>3. Ezek alapján javaslunk személyre szabott történeteket.</li>
        </ul>
      </div>
    </motion.div>
  );
}

function RegisterPageFallback() {
  return (
    <div className="space-y-4 rounded-3xl border border-border/60 bg-muted/40 p-6 text-center text-muted-foreground">
      <Loader2 className="mx-auto size-6 animate-spin" />
      <p>Regisztrációs űrlap betöltése…</p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageFallback />}>
      <RegisterPageContent />
    </Suspense>
  );
}
