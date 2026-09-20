import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  cn(
    "relative inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium",
    "transition-[background-color,border-color,color,box-shadow] duration-150",
    "focus-ring",
    // Disabled stays legible rather than fading to a ghost — a 50%-opacity control reads as
    // broken. Keeping pointer-events lets a title/aria-disabled explanation still surface.
    "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
  ),
  {
    variants: {
      variant: {
        primary: "bg-bio-green text-white shadow-sm hover:bg-deep-green active:bg-deep-forest",
        secondary: "border border-border bg-surface text-text hover:border-muted hover:bg-background active:bg-border/50",
        ghost: "text-secondary hover:bg-background hover:text-text active:bg-border/50",
        destructive: "bg-critical-strong text-white shadow-sm hover:bg-critical active:brightness-90",
      },
      size: {
        sm: "h-8 px-3 text-caption",
        md: "h-10 px-4",
        lg: "h-11 px-6",
        // Square target for icon-only controls; still 40px, so it clears the 24px AA minimum.
        icon: "size-10 px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and blocks input. Ignored with `asChild`, which must keep a single child. */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return <Slot className={cn(buttonVariants({ variant, size }), className)} {...props}>{children}</Slot>;
  }

  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
