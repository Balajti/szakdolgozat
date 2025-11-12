import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-2xl border px-4 py-4 text-sm",
  {
    variants: {
      variant: {
        default: "border-muted text-muted-foreground bg-muted/40",
        success: "border-accent text-accent bg-accent/10",
        warning: "border-secondary text-secondary-foreground bg-secondary/10",
        destructive: "border-destructive text-destructive bg-destructive/10",
        info: "border-primary text-primary bg-primary/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const iconMap: Record<NonNullable<VariantProps<typeof alertVariants>["variant"]>, ReactNode> = {
  default: <Info className="size-4" />,
  success: <CheckCircle2 className="size-4" />,
  warning: <TriangleAlert className="size-4" />,
  destructive: <AlertCircle className="size-4" />,
  info: <Info className="size-4" />,
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: string;
  description?: string;
}

export function Alert({ className, variant, title, description, children, ...props }: AlertProps) {
  return (
    <div className={cn(alertVariants({ variant }), className)} role="alert" {...props}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-full bg-white/40 p-1 text-current shadow-sm">
          {iconMap[variant ?? "default"]}
        </span>
        <div className="space-y-1">
          {title ? <h3 className="font-semibold text-base">{title}</h3> : null}
          {description ? <p className="text-sm text-current/80">{description}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
