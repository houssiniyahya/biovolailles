import Link from "next/link";
import { DATA_STATUS_LABEL } from "@/lib/status-colors";
import type { ScopeQualitySummary } from "@/services/dashboard/types";

function scoreTone(score: number): string {
  if (score >= 90) return "text-success-strong";
  if (score >= 70) return "text-warning-strong";
  return "text-critical-strong";
}

/**
 * Scope-wide rollup of the same per-lot engine behind the Lot "Données" tab
 * (services/quality/lot-quality.ts / components/domain/DataQualityCard.tsx) — never a
 * second quality computation, just an aggregate over lots already scored (phase-5 brief §8).
 */
export function ScopeDataQualityCard({ summary }: { summary: ScopeQualitySummary }) {
  const statusEntries = Object.entries(summary.byDataStatus).filter(([, count]) => count > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-6">
        <span className={`text-4xl font-bold ${scoreTone(summary.scorePercent)}`}>{summary.scorePercent}%</span>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-secondary">
          {statusEntries.length === 0 ? (
            <span className="text-secondary">Aucun enregistrement structuré dans ce périmètre.</span>
          ) : (
            statusEntries.map(([status, count]) => (
              <span key={status}>
                <strong className="text-text">{count}</strong> {DATA_STATUS_LABEL[status as keyof typeof DATA_STATUS_LABEL]}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
        <span className="text-secondary">
          <strong className="text-critical-strong">{summary.errorCount}</strong> erreur(s) ·{" "}
          <strong className="text-warning-strong">{summary.warningCount}</strong> avertissement(s) ·{" "}
          <strong className="text-text">{summary.lotsWithIssues}</strong> lot(s) concerné(s)
        </span>
        <Link href="/lots" className="focus-ring font-medium text-bio-green hover:underline">
          Voir les lots →
        </Link>
      </div>
    </div>
  );
}
