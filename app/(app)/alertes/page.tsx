import { AlertListItem } from "@/components/domain/AlertListItem";
import { PageHeader } from "@/components/domain/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireModuleAccess } from "@/services/auth/guard";
import { listAlertsInScope } from "@/services/intelligence/queries";

export default async function AlertsListPage() {
  const session = await requireModuleAccess("ALERTS");
  const alerts = await listAlertsInScope(session);
  const open = alerts.filter((a) => a.alert.status === "OPEN" || a.alert.status === "ACKNOWLEDGED");
  const closed = alerts.filter((a) => a.alert.status === "RESOLVED" || a.alert.status === "DISMISSED");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alertes"
        description="Alertes générées par le moteur de règles à partir des anomalies détectées dans votre périmètre."
      />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">En cours ({open.length})</h2>
        {open.length === 0 ? (
          <EmptyState title="Aucune alerte en cours" description="Aucune alerte ouverte ou prise en compte dans ce périmètre." />
        ) : (
          <div className="flex flex-col gap-2">
            {open.map((entry) => (
              <AlertListItem key={entry.alert.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {closed.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text">Traitées ({closed.length})</h2>
          <div className="flex flex-col gap-2">
            {closed.map((entry) => (
              <AlertListItem key={entry.alert.id} entry={entry} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
