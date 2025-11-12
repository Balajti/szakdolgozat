import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", prefixIcon, suffixIcon, ...props }, ref) => (
    <div className={cn("relative flex items-center", prefixIcon ? "pl-10" : "")}>
      {prefixIcon ? (
        <span className="pointer-events-none absolute left-4 text-muted-foreground">
          {prefixIcon}
        </span>
      ) : null}
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-border/70 bg-white px-4 py-2 text-base text-foreground shadow-sm transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60",
          prefixIcon ? "pl-2" : "",
          suffixIcon ? "pr-11" : "",
          className,
        )}
        ref={ref}
        {...props}
      />
      {suffixIcon ? (
        <span className="pointer-events-none absolute right-4 text-muted-foreground">
          {suffixIcon}
        </span>
      ) : null}
    </div>
  ),
);
Input.displayName = "Input";

export { Input };
