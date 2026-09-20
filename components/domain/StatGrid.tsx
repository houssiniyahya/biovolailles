import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The "identity bar" that sits under a detail page's header — population, dates, counts.
 * Five pages had each grown their own private `HeaderStat`/`SummaryStat` with slightly
 * different label sizes and casing; this is the single definition (§3).
 */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-5 rounded-lg border border-border bg-surface p-5 md:grid-cols-4", className)}>
      {children}
    </dl>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Semantic emphasis for values that carry a verdict (e.g. a failing check count). */
  tone?: "default" | "success" | "warning" | "critical";
}) {
  const toneClass =
    tone === "success"
      ? "text-success-strong"
      : tone === "warning"
        ? "text-warning-strong"
        : tone === "critical"
          ? "text-critical-strong"
          : "text-text";

  return (
    <div className="min-w-0">
      <dt className="text-overline">{label}</dt>
      <dd className={cn("mt-1 truncate text-base font-semibold tabular-nums", toneClass)}>{value}</dd>
      {hint ? <p className="mt-0.5 truncate text-caption text-secondary">{hint}</p> : null}
    </div>
  );
}

/** Label/value pair for dense definition lists inside cards. */
export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <dt className="shrink-0 text-caption text-secondary">{label}</dt>
      <dd className="min-w-0 text-right text-caption font-medium text-text">{value}</dd>
    </div>
  );
}
