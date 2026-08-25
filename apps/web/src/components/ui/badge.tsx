import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase tracking-wide select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground border-border",
        tallyOnAir:
          "bg-red-500/20 text-red-400 border-red-500/40 tally-on-air",
        tallyStandby:
          "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 tally-ready",
        tallyAmber:
          "bg-amber-500/20 text-amber-400 border-amber-500/40",
        info:
          "bg-sky-500/10 text-sky-400 border-sky-500/30",
        teal:
          "bg-teal-500/10 text-teal-400 border-teal-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
