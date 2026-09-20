import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { DataStatusBadge } from "@/components/domain/DataStatusBadge";
import type { DataStatus } from "@/domain/shared/enums";
import type { TimelineEntry } from "@/services/traceability/chain";

/** "What happened, and when" (phase-7 brief §10) — a strict chronological read, complementary to the graph, never a replacement for it. */
export function TraceabilityTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState icon={CalendarClock} title="Aucun événement" description="Aucun événement enregistré pour ce lot." />;
  }

  return (
    <ol className="flex flex-col gap-4">
      {entries.map((entry, index) => (
        <li key={`${entry.nodeType}-${entry.nodeId}-${index}`} className="flex gap-3 border-l-2 border-border pl-4">
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text">{entry.label}</span>
              <span className="text-xs text-secondary">{new Date(entry.timestamp).toLocaleString("fr-FR")}</span>
              {entry.dataStatus ? <DataStatusBadge status={entry.dataStatus as DataStatus} /> : null}
            </div>
            {entry.description ? <p className="mt-0.5 text-xs text-secondary">{entry.description}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
