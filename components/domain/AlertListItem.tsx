import Link from "next/link";
import { AlertSeverityBadge } from "./AlertSeverityBadge";
import { AlertStatusBadge } from "./AlertStatusBadge";
import type { AlertWithContext } from "@/services/intelligence/queries";

export function AlertListItem({ entry }: { entry: AlertWithContext }) {
  const { alert, anomaly, rule } = entry;
  const context = entry.lotCode
    ? `Lot ${entry.lotCode} — ${entry.farmName ?? "—"}`
    : entry.buildingCode
      ? `${entry.buildingCode} — ${entry.farmName ?? "—"}`
      : "—";

  return (
    <Link
      href={`/alertes/${alert.id}`}
      className="focus-ring flex flex-col gap-2 rounded-md border border-border px-4 py-3 transition-colors hover:bg-background sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <AlertSeverityBadge severity={anomaly.severity} />
          <AlertStatusBadge status={alert.status} />
          <span className="text-sm font-medium text-text">{rule?.name ?? anomaly.explanation.what}</span>
        </div>
        <p className="text-xs text-secondary">{anomaly.explanation.whatChanged}</p>
        <p className="text-xs text-secondary">
          {context} · {new Date(anomaly.detectedAt).toLocaleString("fr-FR")}
        </p>
      </div>
      {anomaly.deviationPercent !== null ? (
        <span className="shrink-0 text-sm font-semibold text-text">
          {anomaly.deviationPercent > 0 ? "+" : ""}
          {anomaly.deviationPercent}
          {anomaly.unit === "%" ? "%" : ` ${anomaly.unit ?? ""}`}
        </span>
      ) : null}
    </Link>
  );
}
