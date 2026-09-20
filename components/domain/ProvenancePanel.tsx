import type { ReactNode } from "react";
import { DataStatusBadge } from "@/components/domain/DataStatusBadge";
import type { ProvenanceSummary } from "@/domain/shared/provenance";
import { SOURCE_TYPE_LABEL, VALIDATION_STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/cn";

/**
 * Reusable "where did this value come from?" panel (phase-3 brief §12) — one component,
 * used wherever a ProvenanceSummary exists: lot data records, IoT sensors, chain nodes.
 *
 * Presented as a data passport (§13): the measured value leads, its status sits directly
 * beneath it, and the acquisition details follow in a dense grid. Fields with nothing to
 * report are dropped rather than rendered as a column of "—" — an empty row costs the same
 * scan time as a real one.
 */
export function ProvenancePanel({
  summary,
  value,
  unit,
  className,
}: {
  summary: ProvenanceSummary;
  /** The measured value this provenance describes. Optional — chain nodes have no single value. */
  value?: number | string | null;
  unit?: string;
  className?: string;
}) {
  const fields: Array<{ label: string; content: ReactNode }> = [
    { label: "Source", content: SOURCE_TYPE_LABEL[summary.source] },
    { label: "Acteur", content: summary.actorName },
    { label: "Horodatage", content: new Date(summary.timestamp).toLocaleString("fr-FR") },
    { label: "Lot", content: summary.lotCode },
    { label: "Bâtiment", content: summary.buildingCode },
    { label: "Appareil", content: summary.deviceId },
    { label: "Document", content: summary.documentId },
    { label: "Méthode", content: summary.measurementMethod },
    { label: "Validation", content: summary.validationStatus ? VALIDATION_STATUS_LABEL[summary.validationStatus] : null },
    { label: "Formule", content: summary.formula },
  ].filter((field) => field.content !== null && field.content !== undefined && field.content !== "");

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {value !== undefined && value !== null ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border pb-3">
          <span className="text-metric">{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</span>
          {unit ? <span className="text-sm text-secondary">{unit}</span> : null}
          <DataStatusBadge status={summary.status} className="ml-auto self-center" />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-overline">Statut</span>
          <DataStatusBadge status={summary.status} />
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
        {fields.map((field) => (
          <div key={field.label} className="min-w-0">
            <dt className="text-micro font-semibold uppercase tracking-wide text-muted">{field.label}</dt>
            <dd className="mt-0.5 truncate text-caption text-text" title={typeof field.content === "string" ? field.content : undefined}>
              {field.content}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
