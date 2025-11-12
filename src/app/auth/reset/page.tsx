"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const resetSchema = z.object({
  email: z.string().email("Érvényes e-mail cím szükséges"),
});

type ResetInput = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");

  const form = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ResetInput) => {
    setStatus("loading");
    await new Promise((resolve) => setTimeout(resolve, 700));
    console.info("Password reset requested", values.email);
    setStatus("sent");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="space-y-3">
        <Badge variant="outline" className="w-fit bg-muted/60 text-muted-foreground">
          Jelszó visszaállítása
        </Badge>
        <h1 className="font-display text-3xl text-foreground">Elfelejtetted a jelszavad?</h1>
        <p className="text-sm text-muted-foreground">
          Írd be az e-mail címed, és elküldjük az utasításokat a jelszó visszaállításához.
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
                  <Input type="email" placeholder="te@iskola.hu" prefixIcon={<Mail className="size-4" />} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {status === "sent" ? (
            <Alert variant="success" title="E-mail elküldve" description="Ellenőrizd a postafiókod, és kövesd a benne található lépéseket." />
          ) : null}

          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
            Jelszó visszaállítása
          </Button>
        </form>
      </Form>

      <div className="rounded-3xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
        Vissza a {" "}
        <Link href="/auth/login" className="font-semibold text-primary">
          bejelentkezéshez
        </Link>
        .
      </div>
    </motion.div>
  );
}
