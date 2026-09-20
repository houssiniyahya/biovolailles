import { CalendarClock } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LotEvent } from "@/domain/production/types";
import { EVENT_TYPE_LABEL, summarizeEventPayload } from "@/lib/event-labels";

export function EventsTimeline({ events }: { events: LotEvent[] }) {
  if (events.length === 0) {
    return <EmptyState icon={CalendarClock} title="Aucun événement" description="Aucun événement n'a encore été enregistré pour ce lot." />;
  }

  return (
    <ol className="flex flex-col gap-4">
      {events.map((event) => {
        const summary = summarizeEventPayload(event.eventType, event.payload);
        return (
          <li key={event.id} className="flex gap-3 border-l-2 border-border pl-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text">{EVENT_TYPE_LABEL[event.eventType]}</span>
                <span className="text-xs text-secondary">{new Date(event.occurredAt).toLocaleString("fr-FR")}</span>
              </div>
              {summary ? <p className="mt-0.5 text-xs text-secondary">{summary}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
