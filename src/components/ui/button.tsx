import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_18px_45px_-25px_rgba(255,122,48,0.8)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-[0_10px_30px_-12px_rgba(239,68,68,0.7)] hover:bg-destructive/90",
        outline:
          "border border-border/80 bg-white hover:border-primary/40 hover:bg-primary/10",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        ghost: "hover:bg-primary/15 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-to-r from-[#ff7a30] via-[#f4c095] to-[#465c88] text-white shadow-[0_25px_60px_-35px_rgba(0,0,0,0.65)]",
      },
      size: {
        default: "h-12 px-6 has-[>svg]:px-5",
        sm: "h-10 rounded-lg gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-14 rounded-2xl px-8 text-base has-[>svg]:px-6",
        icon: "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export { Button, buttonVariants }
