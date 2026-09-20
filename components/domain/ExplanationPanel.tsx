import { Badge } from "@/components/ui/Badge";
import type { AnomalyExplanation, Confidence } from "@/domain/intelligence/types";
import type { AlertSeverity } from "@/domain/shared/enums";
import { CONFIDENCE_LABEL, CONFIDENCE_TONE } from "@/lib/status-colors";
import { AlertSeverityBadge } from "./AlertSeverityBadge";

/**
 * The eight questions, grouped rather than listed. As a flat eight-cell grid every question
 * carried identical weight, so "what happened" was no easier to find than "which data was
 * this based on" — §11 asks for the answer first and the justification after.
 */
const GROUPS: { title: string; rows: { key: keyof AnomalyExplanation; question: string }[] }[] = [
  {
    title: "Situation",
    rows: [
      { key: "where", question: "Où ?" },
      { key: "when", question: "Quand ?" },
    ],
  },
  {
    title: "Mesure",
    rows: [
      { key: "whatChanged", question: "Qu'est-ce qui a changé ?" },
      { key: "comparedTo", question: "Comparé à quoi ?" },
      { key: "byHowMuch", question: "De combien ?" },
    ],
  },
  {
    title: "Fondement",
    rows: [
      { key: "basedOnData", question: "Sur quelles données ?" },
      { key: "whyTriggered", question: "Pourquoi la règle s'est déclenchée ?" },
    ],
  },
];

/**
 * The reusable Explanation component (phase-6 brief §12) — every anomaly renders through
 * this, answering all eight questions with the real numbers the rule engine computed. Never
 * a canned "AI detected anomaly" string.
 */
export function ExplanationPanel({
  explanation,
  severity,
  confidence,
}: {
  explanation: AnomalyExplanation;
  severity: AlertSeverity;
  confidence: Confidence;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* The answer, stated plainly, before any of the supporting detail. */}
      <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-background p-4">
        <div className="flex flex-wrap items-center gap-2">
          <AlertSeverityBadge severity={severity} />
          <Badge tone={CONFIDENCE_TONE[confidence]}>{CONFIDENCE_LABEL[confidence]}</Badge>
        </div>
        <p className="text-base leading-relaxed font-medium text-text">{explanation.what}</p>
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} className="flex flex-col gap-2.5">
          <h3 className="text-overline">{group.title}</h3>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {group.rows.map((row) => (
              <div key={row.key} className="flex flex-col gap-0.5">
                <dt className="text-caption font-semibold text-secondary">{row.question}</dt>
                <dd className="text-sm leading-relaxed text-text">{explanation[row.key]}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
