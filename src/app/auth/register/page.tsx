"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Suspense, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, CalendarDays, Loader2, Lock, Mail, UserPlus, CheckCircle2, Circle } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  registerSchema,
  type RegisterInput,
} from "@/lib/auth-client";
import { signUp, confirmSignUp, resendSignUpCode, signIn } from "aws-amplify/auth";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedRole = (searchParams.get("role") as RegisterInput["role"]) ?? "student";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "confirm" | "confirmed" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const RESEND_COOLDOWN_SECONDS = 30;

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

  const passwordValue = form.watch("password") || "";
  const passwordCriteria = {
    minLength: passwordValue.length >= 8,
    hasLower: /[a-z]/.test(passwordValue),
    hasUpper: /[A-Z]/.test(passwordValue),
    hasNumber: /\d/.test(passwordValue),
    hasSymbol: /[^A-Za-z0-9]/.test(passwordValue),
  } as const;

  useEffect(() => {
    form.setValue("role", preselectedRole);
  }, [form, preselectedRole]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const onSubmit = async (values: RegisterInput) => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const result = await signUp({
        username: values.email,
        password: values.password,
        options: {
          userAttributes: {
            email: values.email,
          },
        },
      });

      if (!result.isSignUpComplete && result.nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
        setStatus("confirm");
      } else {
        setStatus("success");
      }
    } catch (error) {
      console.error(error);
      const err = error as { name?: string; message?: string } | undefined;
      let msg = "Hiba történt a regisztráció során. Ellenőrizd az adatokat vagy próbáld újra később.";
      switch (err?.name) {
        case "UsernameExistsException":
          msg = "Ehhez az e-mail címhez már létezik fiók. Jelentkezz be, vagy kérj új jelszót.";
          break;
        case "InvalidPasswordException":
          msg = "A jelszó nem felel meg a követelményeknek. Legalább 8 karakter, kis- és nagybetű, szám és különleges karakter szükséges.";
          break;
        case "InvalidParameterException":
          msg = "Érvénytelen adatok. Kérjük, ellenőrizd az űrlapot.";
          break;
      }
      setStatus("error");
      setErrorMessage(msg);
    }
  };

  const handleConfirm = async () => {
    if (status !== "confirm") return;
    setIsConfirming(true);
    setErrorMessage(null);
    try {
      const email = form.getValues("email");
      const password = form.getValues("password");

      // Confirm the sign up
      const result = await confirmSignUp({
        username: email,
        confirmationCode,
      });

      if (result.isSignUpComplete) {
        // Auto sign in the user
        try {
          await signIn({
            username: email,
            password: password,
          });

          // Default to student dashboard - they can switch role later
          router.push("/student");
        } catch (signInError) {
          console.error("Auto sign-in failed", signInError);
          setStatus("confirmed");
        }
      } else {
        setStatus("success");
      }
    } catch (error) {
      console.error(error);
      const err = error as { name?: string; message?: string } | undefined;
      let msg = "Nem sikerült megerősíteni a kódot. Ellenőrizd és próbáld újra.";
      switch (err?.name) {
        case "CodeMismatchException":
          msg = "A megadott kód nem megfelelő. Ellenőrizd a karaktereket és próbáld újra.";
          break;
        case "ExpiredCodeException":
          msg = "A kód lejárt. Kérj új kódot az " + '"Kód újraküldése"' + " gombbal.";
          break;
        case "LimitExceededException":
          msg = "Túl sok próbálkozás. Várj pár percet, majd próbáld újra.";
          break;
      }
      setStatus("error");
      setErrorMessage(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResend = async () => {
    if (status !== "confirm" || resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    setResendMessage(null);
    try {
      const email = form.getValues("email");
      await resendSignUpCode({ username: email });
      setResendMessage("Új megerősítő kódot küldtünk az e-mail címedre.");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      console.error(error);
      const err = error as { name?: string; message?: string } | undefined;
      let msg = "Nem sikerült újraküldeni a kódot. Próbáld újra később.";
      switch (err?.name) {
        case "LimitExceededException":
          msg = "Túl sok kérés. Várj pár percet, majd próbáld újra.";
          break;
        case "UserNotFoundException":
          msg = "Ehhez az e-mail címhez nem található felhasználó.";
          break;
        case "NotAuthorizedException":
          msg = "A fiókot már megerősítették. Jelentkezz be.";
          break;
      }
      setErrorMessage(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
      >
        <ArrowLeft className="size-4" />
        Vissza a főoldalra
      </Link>
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
                      Legalább 8 karakter, kis- és nagybetű, szám és különleges karakter szükséges.
                    </FormDescription>
                    <ul className="mt-2 grid gap-1 text-sm list-none">
                      <li className={passwordCriteria.minLength ? "text-green-600" : "text-muted-foreground"}>
                        <span className="inline-flex items-center gap-2">
                          {passwordCriteria.minLength ? <CheckCircle2 className="size-4 shrink-0" /> : <Circle className="size-4 shrink-0" />}
                          Minimum 8 karakter
                        </span>
                      </li>
                      <li className={passwordCriteria.hasLower ? "text-green-600" : "text-muted-foreground"}>
                        <span className="inline-flex items-center gap-2">
                          {passwordCriteria.hasLower ? <CheckCircle2 className="size-4 shrink-0" /> : <Circle className="size-4 shrink-0" />}
                          Tartalmaz kisbetűt (a–z)
                        </span>
                      </li>
                      <li className={passwordCriteria.hasUpper ? "text-green-600" : "text-muted-foreground"}>
                        <span className="inline-flex items-center gap-2">
                          {passwordCriteria.hasUpper ? <CheckCircle2 className="size-4 shrink-0" /> : <Circle className="size-4 shrink-0" />}
                          Tartalmaz nagybetűt (A–Z)
                        </span>
                      </li>
                      <li className={passwordCriteria.hasNumber ? "text-green-600" : "text-muted-foreground"}>
                        <span className="inline-flex items-center gap-2">
                          {passwordCriteria.hasNumber ? <CheckCircle2 className="size-4 shrink-0" /> : <Circle className="size-4 shrink-0" />}
                          Tartalmaz számot (0–9)
                        </span>
                      </li>
                      <li className={passwordCriteria.hasSymbol ? "text-green-600" : "text-muted-foreground"}>
                        <span className="inline-flex items-center gap-2">
                          {passwordCriteria.hasSymbol ? <CheckCircle2 className="size-4 shrink-0" /> : <Circle className="size-4 shrink-0" />}
                          Tartalmaz különleges karaktert (!@#$%^&*…)
                        </span>
                      </li>
                    </ul>
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
            <Alert variant="success" title="Regisztráció elküldve">
              Ellenőrizd az e-mail fiókodat és írd be a megerősítő kódot.
            </Alert>
          ) : null}

          {status === "confirm" ? (
            <div className="space-y-4 rounded-2xl border border-primary/40 bg-primary/5 p-4">
              <Alert variant="info" title="Kód megerősítés szükséges" description="Írd be az e-mailben kapott 6 jegyű kódot." />
              {resendMessage ? (
                <Alert variant="success" title={resendMessage} />
              ) : null}
              <div className="flex gap-3 flex-col">
                <Input
                  placeholder="Megerősítő kód"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value.trim())}
                  className="flex-1"
                />
                <div className="flex gap-3 items-center justify-center">
                  <Button type="button" onClick={handleConfirm} disabled={!confirmationCode || isConfirming}>
                    Megerősítés
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleResend} disabled={isResending || resendCooldown > 0}>
                    {resendCooldown > 0 ? `Kód újraküldése (${resendCooldown}s)` : "Kód újraküldése"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {status === "confirmed" ? (
            <Alert variant="success" title="Sikeres megerősítés">
              A fiók létrejött. Most már <Link href="/auth/login" className="underline">bejelentkezhetsz</Link>.
            </Alert>
          ) : null}

          {status === "error" && errorMessage ? (
            <Alert variant="destructive" title="Hoppá, hiba történt" description={errorMessage} />
          ) : null}

          {status === "confirm" ? null : (
            <Button type="submit" size="lg" variant="gradient" className="w-full" disabled={status === "loading"}>
              {status === "loading" ? <Loader2 className="mr-2 size-5 animate-spin" /> : <UserPlus className="mr-2 size-5" />} Regisztráció
            </Button>
          )}
        </form>
      </Form>

      <div className="rounded-3xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
        Már van fiókod?{" "}
        <Link href="/auth/login" className="font-semibold text-primary">
          Jelentkezz be itt.
        </Link>
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
