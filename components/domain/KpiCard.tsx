import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { KpiResult } from "@/services/intelligence/kpi-service";
import type { TrendResult } from "@/domain/intelligence/trend";
import { KPI_ELIGIBILITY_LABEL, KPI_ELIGIBILITY_TONE } from "@/lib/status-colors";
import { TrendBadge } from "./TrendBadge";

/**
 * Reusable KPI display (phase-6 brief §2, §3) — value + unit + eligibility, never a bare
 * number. A KPI computed from limited/insufficient data is visibly flagged, not silently
 * shown as if fully validated.
 */
export function KpiCard({ result, trend }: { result: KpiResult; trend?: TrendResult }) {
  // Read once so TypeScript keeps the narrowing through the JSX below.
  const value = result.value;
  const unavailable = value === null;

  return (
    <Card className="flex flex-col gap-2.5 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-overline">{result.label}</span>
        <Badge tone={KPI_ELIGIBILITY_TONE[result.eligibility]}>{KPI_ELIGIBILITY_LABEL[result.eligibility]}</Badge>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={unavailable ? "text-metric text-muted" : "text-metric"}>
          {value === null ? "—" : value.toLocaleString("fr-FR")}
        </span>
        {!unavailable ? <span className="text-sm text-secondary">{result.unit}</span> : null}
        {trend ? <TrendBadge trend={trend} /> : null}
      </div>

      <span className="text-caption text-secondary">{result.period.label}</span>

      {/*
       * The reason a KPI is unavailable/limited is the most useful thing on the card when it
       * applies — given a border and a fill so it reads as an explanation, not a footnote.
       */}
      {result.eligibilityReason ? (
        <p className="rounded-md border border-warning/25 bg-warning/10 px-2.5 py-1.5 text-caption leading-relaxed text-warning-strong">
          {result.eligibilityReason}
        </p>
      ) : null}
    </Card>
  );
}
