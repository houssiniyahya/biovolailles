import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  /** Emphasis for values that carry a verdict — a fault count should not look like a neutral total. */
  tone?: "default" | "success" | "warning" | "critical";
  className?: string;
}

export function StatCard({ label, value, icon: Icon, hint, tone = "default", className }: StatCardProps) {
  const valueTone =
    tone === "success"
      ? "text-success-strong"
      : tone === "warning"
        ? "text-warning-strong"
        : tone === "critical"
          ? "text-critical-strong"
          : "text-text";

  return (
    <Card className={cn("flex flex-col gap-1.5 p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-overline">{label}</span>
        {Icon ? <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" /> : null}
      </div>
      <span className={cn("text-metric", valueTone)}>{value}</span>
      {hint ? <span className="text-caption leading-snug text-secondary">{hint}</span> : null}
    </Card>
  );
}
