import { CircleAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import type { NeedsAttentionItem } from "@/services/dashboard/types";

const MAX_VISIBLE = 8;

/** The "À surveiller" section (phase-5 brief §7) — every item links to the object it's about. */
export function NeedsAttentionList({ items }: { items: NeedsAttentionItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Rien à signaler"
        description="Aucune anomalie de données, appareil hors ligne ou lot à surveiller dans ce périmètre."
      />
    );
  }

  const visible = items.slice(0, MAX_VISIBLE);
  const remaining = items.length - visible.length;

  return (
    <div className="flex flex-col gap-2">
      {visible.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="focus-ring flex items-start gap-3 rounded-md border border-border px-3 py-2.5 text-sm transition-colors hover:bg-background"
        >
          {item.severity === "critical" ? (
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-critical-strong" aria-hidden="true" />
          ) : (
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-strong" aria-hidden="true" />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="font-medium text-text">{item.title}</span>
              <span className="text-xs text-secondary">{item.context}</span>
            </div>
            <p className="text-xs text-secondary">{item.reason}</p>
          </div>
        </Link>
      ))}
      {remaining > 0 ? <p className="px-1 text-xs text-secondary">+ {remaining} autre(s) élément(s) dans ce périmètre.</p> : null}
    </div>
  );
}
