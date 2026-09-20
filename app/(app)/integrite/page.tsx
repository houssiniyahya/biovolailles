import { CheckCircle2, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/domain/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/domain/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ALERT_SEVERITY_LABEL, ALERT_SEVERITY_TONE } from "@/lib/status-colors";
import { INTEGRITY_CHECK_LABEL } from "@/lib/labels";
import { can } from "@/domain/shared/permissions";
import { requireModuleAccess } from "@/services/auth/guard";
import { runIntegrityChecks } from "@/services/integrity/checks";
import { IntegrityAcknowledgeButton } from "./IntegrityAcknowledgeButton";

export default async function IntegrityPage() {
  const session = await requireModuleAccess("INTEGRITY");
  const report = await runIntegrityChecks(session);
  const canAcknowledge = can(session, "EDIT", "INTEGRITY");

  const statusTone = report.criticalCount > 0 ? "critical" : report.warningCount > 0 ? "warning" : "success";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Administration", href: "/administration" }, { label: "Intégrité" }]}
        title="Centre d'intégrité"
        description="État de preuve de la plateforme — pas un score déclaratif, mais le résultat d'une vérification en direct de la base."
      />

      <Card className={statusTone === "success" ? "border-success/40" : statusTone === "warning" ? "border-warning/40" : "border-critical/40"}>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            {statusTone === "success" ? (
              <ShieldCheck className="size-9 text-success-strong" aria-hidden="true" />
            ) : statusTone === "warning" ? (
              <TriangleAlert className="size-9 text-warning-strong" aria-hidden="true" />
            ) : (
              <ShieldAlert className="size-9 text-critical-strong" aria-hidden="true" />
            )}
            <div>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-text">{report.statusPercent} %</p>
              <p className="text-caption text-secondary">Statut d&apos;intégrité</p>
            </div>
          </div>
          {/* Three fixed columns squeezed each card to ~90px at 375px; stacks to one now. */}
          <div className="grid w-full flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Problèmes critiques"
              value={report.criticalCount}
              icon={ShieldAlert}
              tone={report.criticalCount > 0 ? "critical" : "success"}
            />
            <StatCard
              label="Avertissements"
              value={report.warningCount}
              icon={TriangleAlert}
              tone={report.warningCount > 0 ? "warning" : "success"}
            />
            <StatCard
              label="Vérifications passées"
              value={`${report.checksPassed} / ${report.checksRun}`}
              icon={CheckCircle2}
              tone={report.checksPassed === report.checksRun ? "success" : "default"}
            />
          </div>
        </CardContent>
      </Card>

      {report.issues.length === 0 ? (
        <EmptyState
          title="Aucun problème détecté"
          description={`${report.checksRun} vérification(s) exécutée(s) sur votre périmètre — tout est cohérent.`}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Problèmes détectés</CardTitle>
            <CardDescription>Triés par sévérité — chaque ligne reflète l&apos;état réel de la base au moment du calcul.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table caption="Problèmes d'intégrité détectés">
              <TableHeader>
                <TableRow>
                  <TableHead>Vérification</TableHead>
                  <TableHead>Sévérité</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Statut</TableHead>
                  {canAcknowledge ? <TableHead>Action</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.issues.map((issue, i) => (
                  <TableRow key={`${issue.code}:${issue.entityType}:${issue.entityId}:${i}`}>
                    <TableCell className="whitespace-nowrap text-xs text-secondary">{INTEGRITY_CHECK_LABEL[issue.code]}</TableCell>
                    <TableCell>
                      <Badge tone={ALERT_SEVERITY_TONE[issue.severity]}>{ALERT_SEVERITY_LABEL[issue.severity]}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-secondary">
                      {issue.entityType} #{issue.entityId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="max-w-64 text-sm">{issue.description}</TableCell>
                    <TableCell className="max-w-64 text-xs text-secondary">{issue.reason}</TableCell>
                    <TableCell>
                      <Badge tone={issue.status === "ACKNOWLEDGED" ? "info" : "neutral"}>
                        {issue.status === "ACKNOWLEDGED" ? "Pris en compte" : "Ouvert"}
                      </Badge>
                    </TableCell>
                    {canAcknowledge ? (
                      <TableCell>
                        <IntegrityAcknowledgeButton
                          code={issue.code}
                          entityType={issue.entityType}
                          entityId={issue.entityId}
                          description={issue.description}
                          acknowledged={issue.status === "ACKNOWLEDGED"}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
