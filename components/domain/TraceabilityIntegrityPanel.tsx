import { ShieldCheck } from "lucide-react";
import { AlertSeverityBadge } from "@/components/domain/AlertSeverityBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TraceabilityIssue } from "@/services/traceability/integrity";

/** Automated integrity findings (phase-7 brief §13) — structured, explainable issues, never a bare pass/fail flag. */
export function TraceabilityIntegrityPanel({ issues }: { issues: TraceabilityIssue[] }) {
  if (issues.length === 0) {
    return (
      <EmptyState icon={ShieldCheck} title="Chaîne cohérente" description="Aucune anomalie de traçabilité détectée pour ce lot." />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {issues.map((issue, index) => (
        <li key={index} className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5">
          <AlertSeverityBadge severity={issue.severity} className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-secondary">{issue.code}</span>
            <p className="text-sm text-text">{issue.message}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
