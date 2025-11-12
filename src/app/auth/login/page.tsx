"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Lock, LogIn, Mail, Sparkles } from "lucide-react";

import { loginSchema, type LoginInput, mockLogin, mockUsers } from "@/lib/auth-client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const result = await mockLogin(values);
      setStatus("success");

      const redirectPath = result.role === "teacher" ? "/teacher" : "/student";
      router.push(redirectPath);
    } catch (error) {
      console.error(error);
      setStatus("error");
      setErrorMessage("Hibás belépési adatok vagy átmeneti hiba.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="space-y-4">
        <Badge variant="outline" className="w-fit bg-primary/10 text-primary">
          Bejelentkezés
        </Badge>
        <h1 className="font-display text-3xl text-foreground">Üdv újra a WordNestben</h1>
        <p className="text-muted-foreground">
          Lépj be, és folytasd az angoltanulást játékos történetekkel. A tanárok ellenőrizhetik osztályaik előrehaladását, a diákok
          pedig új sztorikat kérhetnek.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail cím</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="te@iskola.hu" prefixIcon={<Mail className="size-4" />} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jelszó</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" placeholder="••••••" prefixIcon={<Lock className="size-4" />} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <label htmlFor="remember">Emlékezz rám ezen az eszközön</label>
            </div>
            <Link href="/auth/reset" className="font-semibold text-primary">
              Elfelejtett jelszó?
            </Link>
          </div>

          {status === "error" && errorMessage ? (
            <Alert variant="destructive" title="Belépés sikertelen" description={errorMessage} />
          ) : null}

          {status === "success" ? (
            <Alert variant="success" title="Sikeres belépés">
              Átirányítás a vezérlőpultra…
            </Alert>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? <Loader2 className="mr-2 size-5 animate-spin" /> : <LogIn className="mr-2 size-5" />} Belépés
          </Button>
        </form>
      </Form>

      <div className="rounded-3xl border border-border/60 bg-muted/50 p-4 text-sm text-muted-foreground">
        Nincs még fiókod?{" "}
        <Link href="/auth/register" className="font-semibold text-primary">
          Regisztrálj itt.
        </Link>
      </div>

      <div className="space-y-3 rounded-3xl border border-primary/40 bg-primary/5 p-5 text-sm text-primary">
        <p className="flex items-center gap-2 font-semibold text-primary">
          <Sparkles className="size-4" /> Demó belépési adatok
        </p>
        <p className="text-primary/80">
          Az alábbi teszt felhasználókkal AWS fiók nélkül is kipróbálhatod a WordNestet:
        </p>
        <ul className="space-y-2">
          {mockUsers.map((user) => (
            <li key={user.email} className="rounded-2xl border border-primary/30 bg-white/80 p-3 text-sm text-foreground shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-foreground">
                  {user.role === "teacher" ? "Tanári demó" : "Diák demó"}
                </span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs uppercase tracking-wide text-primary">
                  {user.role}
                </span>
              </div>
              <dl className="mt-2 space-y-1 text-muted-foreground">
                <div className="flex flex-wrap items-center gap-1">
                  <dt className="font-medium">E-mail:</dt>
                  <dd>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{user.email}</code>
                  </dd>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <dt className="font-medium">Jelszó:</dt>
                  <dd>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{user.password}</code>
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
