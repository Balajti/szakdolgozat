"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Suspense, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";

import {
  inviteAcceptSchema,
  mockAcceptInvite,
  type InviteAcceptInput,
} from "@/lib/auth-client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

function InvitePageContent() {
  const params = useSearchParams();
  const emailFromLink = params.get("email") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<InviteAcceptInput>({
    resolver: zodResolver(inviteAcceptSchema),
    defaultValues: {
      email: emailFromLink,
      temporaryPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: InviteAcceptInput) => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      await mockAcceptInvite(values);
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setErrorMessage("Az ideiglenes jelszó érvénytelen vagy lejárt. Kérj új meghívót a tanárodtól.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="space-y-3">
        <Badge variant="outline" className="w-fit bg-secondary/20 text-secondary-foreground">
          Tanári meghívó aktiválása
        </Badge>
        <h1 className="font-display text-3xl text-foreground">Csatlakozz a WordNest osztályodhoz</h1>
        <p className="text-sm text-muted-foreground">
          A tanárod egyedi meghívót küldött. Add meg az ideiglenes jelszót, és állíts be egy biztonságos új jelszót a belépéshez.
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
                  <Input
                    type="email"
                    prefixIcon={<Mail className="size-4" />}
                    readOnly={Boolean(emailFromLink)}
                    className={emailFromLink ? "bg-muted/50" : undefined}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Ha nem a saját e-mail címed látod, jelezd a tanárodnak.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="temporaryPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ideiglenes jelszó</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Tanár által küldött kód"
                    prefixIcon={<ShieldCheck className="size-4" />}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Új jelszó</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Új jelszó" {...field} />
                  </FormControl>
                  <FormDescription>Legalább 8 karaktert adj meg.</FormDescription>
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
                    <Input type="password" placeholder="Írd be újra" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {status === "success" ? (
            <Alert variant="success" title="Sikeres aktiválás" description="Most már beléphetsz a WordNest felületére." />
          ) : null}

          {status === "error" && errorMessage ? (
            <Alert variant="destructive" title="Aktiválás sikertelen" description={errorMessage} />
          ) : null}

          <Button type="submit" disabled={status === "loading"} className="w-full">
            {status === "loading" ? <Loader2 className="mr-2 size-5 animate-spin" /> : <CheckCircle2 className="mr-2 size-5" />} Aktiválás
          </Button>
        </form>
      </Form>

      <div className="rounded-3xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
        Még nincs fiókod?{" "}
        <Link href="/auth/register/role-select" className="font-semibold text-primary">
          Regisztrálj itt.
        </Link>
      </div>
    </motion.div>
  );
}

function InvitePageFallback() {
  return (
    <div className="space-y-4 rounded-3xl border border-border/60 bg-muted/40 p-6 text-center text-muted-foreground">
      <Loader2 className="mx-auto size-6 animate-spin" />
      <p>Meghívó adatok betöltése…</p>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<InvitePageFallback />}>
      <InvitePageContent />
    </Suspense>
  );
}
