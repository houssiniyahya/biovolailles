import { AlertTriangle, CircleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { LotDataQualitySummary } from "@/services/quality/lot-quality";
import { DATA_STATUS_LABEL } from "@/lib/status-colors";

function scoreTone(score: number): string {
  if (score >= 90) return "text-success-strong";
  if (score >= 70) return "text-warning-strong";
  return "text-critical-strong";
}

/** The per-lot "Data Quality" summary (phase-3 brief §17) — every number here comes from computeLotDataQuality, never hardcoded. */
export function DataQualityCard({ summary }: { summary: LotDataQualitySummary }) {
  const statusEntries = Object.entries(summary.byDataStatus).filter(([, count]) => count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qualité des données</CardTitle>
        <CardDescription>Calculée à partir des {summary.totalRecords} enregistrement(s) structuré(s) de ce lot.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end gap-6">
          <span className={`text-4xl font-bold ${scoreTone(summary.scorePercent)}`}>{summary.scorePercent}%</span>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-secondary">
            {statusEntries.length === 0 ? (
              <span className="text-secondary">Aucun enregistrement structuré pour ce lot.</span>
            ) : (
              statusEntries.map(([status, count]) => (
                <span key={status}>
                  <strong className="text-text">{count}</strong> {DATA_STATUS_LABEL[status as keyof typeof DATA_STATUS_LABEL]}
                </span>
              ))
            )}
          </div>
        </div>

        {summary.errorCount > 0 || summary.warningCount > 0 ? (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            {summary.issues.map((entry, index) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                {entry.issue.severity === "error" ? (
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-critical-strong" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning-strong" aria-hidden="true" />
                )}
                <span className={entry.issue.severity === "error" ? "text-critical-strong" : "text-warning-strong"}>
                  {entry.issue.message}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="border-t border-border pt-3 text-xs text-success-strong">Aucune anomalie détectée.</p>
        )}

        {!summary.populationReconciliation.consistent ? (
          <div className="rounded-md border border-critical/30 bg-critical/5 px-3 py-2 text-xs text-critical-strong">
            <p className="font-semibold uppercase tracking-wide">Incohérence détectée</p>
            <p className="mt-1">
              Population attendue : {summary.populationReconciliation.expectedPopulation} — Population enregistrée :{" "}
              {summary.populationReconciliation.recordedPopulation} (écart de {summary.populationReconciliation.difference}).
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
