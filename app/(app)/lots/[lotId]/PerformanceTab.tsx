import { KpiCard } from "@/components/domain/KpiCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import type { KpiWithTrend } from "@/services/intelligence/performance-service";

/** The Lot page's "Performance" tab (phase-6 brief §20) — every number here comes from services/intelligence/kpi-service.ts, nothing computed in this component. */
export function PerformanceTab({ kpis }: { kpis: KpiWithTrend[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map(({ code, result, trend }) => (
          <KpiCard key={code} result={result} trend={trend} />
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Comment ces indicateurs sont calculés</CardTitle>
          <CardDescription>Chaque KPI expose sa propre formule, sa période de référence et son statut de données.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-xs text-secondary">
          {kpis.map(({ code, result }) => (
            <p key={code}>
              <strong className="text-text">{result.label}</strong> — {result.formula}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
