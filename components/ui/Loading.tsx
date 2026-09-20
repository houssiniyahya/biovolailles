import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin text-muted", className)} aria-hidden="true" />;
}

export function LoadingState({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-sm text-secondary" role="status">
      <Spinner className="size-6" />
      <span>{label}</span>
    </div>
  );
}

/**
 * Skeleton primitive for route-level loading (§20). Preferred over a centred spinner on
 * screens whose shape is known ahead of time: it holds the layout, so the page doesn't jump
 * when data lands, and it signals *what* is loading instead of just *that* something is.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-border/60", className)} aria-hidden="true" />;
}

export function SkeletonText({ className, width = "w-full" }: { className?: string; width?: string }) {
  return <Skeleton className={cn("h-3.5", width, className)} />;
}

/** Page-header + stat-grid + card-stack shell, matching the layout every list/detail route uses. */
export function PageSkeleton({ stats = 0, cards = 2 }: { stats?: number; cards?: number }) {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Chargement de la page">
      <div className="flex flex-col gap-3 border-b border-border pb-5">
        <SkeletonText width="w-40" className="h-3" />
        <Skeleton className="h-7 w-64" />
        <SkeletonText width="w-96" />
      </div>

      {stats > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: stats }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : null}

      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
          <SkeletonText width="w-48" />
          <SkeletonText width="w-72" className="h-3" />
          <Skeleton className="mt-2 h-32" />
        </div>
      ))}
      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}

/** Skeleton shaped like the Table primitive, for table-first routes (audit, users, alerts). */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-border" role="status" aria-label="Chargement du tableau">
      <div className="flex gap-4 border-b border-border bg-background px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-border px-4 py-3.5 last:border-b-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
      <span className="sr-only">Chargement en cours…</span>
    </div>
  );
}
