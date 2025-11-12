import { ReactNode } from "react";
import { motion } from "motion/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  delay?: number;
}

export function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="h-full"
    >
      <Card className="h-full border-none bg-white/80 shadow-xl">
        <CardHeader className="flex flex-row items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </span>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-base leading-relaxed text-muted-foreground">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
}
