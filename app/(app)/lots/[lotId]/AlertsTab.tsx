import { AlertListItem } from "@/components/domain/AlertListItem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AlertWithContext } from "@/services/intelligence/queries";
import { RunDetectionButton } from "./RunDetectionButton";

/** The Lot page's "Alertes" tab (phase-6 brief §20) — the exact same alert records the dashboard and /alertes show, filtered to this lot. */
export function AlertsTab({ lotId, alerts, canRunDetection }: { lotId: string; alerts: AlertWithContext[]; canRunDetection: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Anomalies et alertes</CardTitle>
            <CardDescription>Résultat du moteur de règles pour ce lot.</CardDescription>
          </div>
          {canRunDetection ? <RunDetectionButton lotId={lotId} /> : null}
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <EmptyState title="Aucune alerte" description="Aucune anomalie détectée pour ce lot pour le moment." />
        ) : (
          <div className="flex flex-col gap-2">
            {alerts.map((entry) => (
              <AlertListItem key={entry.alert.id} entry={entry} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
