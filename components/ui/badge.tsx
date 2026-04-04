import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1 text-xs font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--elevated)] text-[color:var(--text-secondary)] border-[color:var(--border)]",
        accent:
          "bg-[color:var(--accent-surface)] text-[color:var(--accent-primary)] border-[color:var(--accent-primary)]/30",
        critical:
          "bg-[color:var(--critical-surface)] text-[color:var(--accent-critical)] border-[color:var(--accent-critical)]/30",
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
