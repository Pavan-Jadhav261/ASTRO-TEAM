import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-[color:var(--background)]",
  {
    variants: {
      variant: {
        primary:
          "bg-[linear-gradient(135deg,var(--accent-primary),var(--accent-secondary))] text-white shadow-[0_10px_30px_-12px_rgba(99,102,241,0.6)] hover:brightness-110",
        secondary:
          "bg-[color:var(--surface)] text-[color:var(--text-primary)] border border-[color:var(--border)] hover:border-[color:var(--accent-primary)]",
        ghost:
          "bg-transparent text-[color:var(--text-primary)] hover:bg-[color:var(--elevated)]",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
