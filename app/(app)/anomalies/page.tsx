import Link from "next/link";
import { AlertSeverityBadge } from "@/components/domain/AlertSeverityBadge";
import { PageHeader } from "@/components/domain/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { CONFIDENCE_LABEL, CONFIDENCE_TONE } from "@/lib/status-colors";
import { requireModuleAccess } from "@/services/auth/guard";
import { listAlertsInScope } from "@/services/intelligence/queries";

/** Read-only, evidence-oriented view of what the rule engine has found (phase-6 brief §9-§11) — acting on a finding happens on its linked alert. */
export default async function AnomaliesListPage() {
  const session = await requireModuleAccess("ANOMALIES");
  const entries = await listAlertsInScope(session);
  const sorted = [...entries].sort((a, b) => new Date(b.anomaly.detectedAt).getTime() - new Date(a.anomaly.detectedAt).getTime());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Anomalies" description="Résultat brut du moteur de règles — chaque ligne renvoie vers son alerte." />

      {sorted.length === 0 ? (
        <EmptyState title="Aucune anomalie" description="Le moteur de règles n'a rien détecté dans votre périmètre." />
      ) : (
        <Table caption="Anomalies détectées">
          <TableHeader>
            <TableRow>
              <TableHead>Règle</TableHead>
              <TableHead>Contexte</TableHead>
              <TableHead>Sévérité</TableHead>
              <TableHead>Écart</TableHead>
              <TableHead>Confiance</TableHead>
              <TableHead>Détectée le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(({ alert, anomaly, rule, lotCode, buildingCode, farmName }) => (
              <TableRow key={anomaly.id}>
                <TableCell>
                  <Link href={`/alertes/${alert.id}`} className="focus-ring font-medium text-bio-green hover:underline">
                    {rule?.name ?? anomaly.explanation.what}
                  </Link>
                </TableCell>
                <TableCell>{lotCode ? `Lot ${lotCode}` : buildingCode ? buildingCode : "—"} — {farmName ?? "—"}</TableCell>
                <TableCell>
                  <AlertSeverityBadge severity={anomaly.severity} />
                </TableCell>
                <TableCell>
                  {anomaly.deviationPercent !== null ? `${anomaly.deviationPercent > 0 ? "+" : ""}${anomaly.deviationPercent}${anomaly.unit === "%" ? "%" : ` ${anomaly.unit ?? ""}`}` : "—"}
                </TableCell>
                <TableCell>
                  <Badge tone={CONFIDENCE_TONE[anomaly.confidence]}>{CONFIDENCE_LABEL[anomaly.confidence]}</Badge>
                </TableCell>
                <TableCell>{new Date(anomaly.detectedAt).toLocaleString("fr-FR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
