import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

/**
 * Every tone pairs a tinted fill with a bordered outline and AA-contrast text
 * (--color-*-strong). The border matters for accessibility as much as for looks: at a 10%
 * tint the fills are nearly indistinguishable from each other in greyscale, so the badge
 * would be carrying its meaning in hue alone. The label text is always the real signal
 * (§18 — "critical status must be understandable without colour").
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border bg-background text-secondary",
        success: "border-success/25 bg-success/10 text-success-strong",
        warning: "border-warning/30 bg-warning/10 text-warning-strong",
        critical: "border-critical/25 bg-critical/10 text-critical-strong",
        info: "border-info/25 bg-info/10 text-info-strong",
        gold: "border-gold/45 bg-gold/15 text-deep-forest",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
