import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/domain/PageHeader";
import { StatCard } from "@/components/domain/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { env } from "@/lib/env";
import { publicPassportUrl } from "@/lib/public-url";
import { requireModuleAccess } from "@/services/auth/guard";
import { runDemoHealthChecks, type HealthStatus } from "@/services/demo/health";
import { repositories } from "@/data/repositories";
import { HERO_LOT_CODE } from "@/data/seed/seed-database";
import { DemoResetPanel } from "./DemoResetPanel";
import { AnomalyScenarioPanel } from "./AnomalyScenarioPanel";
import { HEALTH_STATUS_LABEL } from "@/lib/labels";

const TONE: Record<HealthStatus, "success" | "warning" | "critical"> = {
  OK: "success",
  WARN: "warning",
  FAIL: "critical",
};

/**
 * Internal demo/system validation screen (phase-10 brief §15). Not a product surface — it
 * exists so a broken demonstration is caught here rather than in front of a reviewer. Gated
 * on SETTINGS, i.e. SUPER_ADMIN only.
 */
export default async function DemoHealthPage() {
  const session = await requireModuleAccess("SETTINGS");
  const report = await runDemoHealthChecks(session);

  const heroLot = await repositories.lots.findByCode(HERO_LOT_CODE);
  const tokens = heroLot ? await repositories.qrTokens.listByLot(heroLot.id) : [];
  const activeTokens = tokens.filter((t) => t.active);

  // Deep links straight to the hero records — the presenter should never hunt through a list
  // on stage (phase-15 brief §8). Ids change on every reseed, so they are resolved here.
  const heroAnomalies = heroLot ? await repositories.anomalies.listByLot(heroLot.id) : [];
  const heroAlerts = heroAnomalies.length
    ? await repositories.alerts.listByAnomalyIds(heroAnomalies.map((a) => a.id))
    : [];
  const openHeroAlert = heroAlerts.find((a) => a.status === "OPEN") ?? heroAlerts[0] ?? null;
  const productToken = activeTokens.find((t) => t.scope === "PRODUCT") ?? activeTokens[0] ?? null;

  const heroBuilding = heroLot ? await repositories.buildings.findById(heroLot.buildingId) : null;
  const farmId = heroBuilding?.farmId ?? null;

  const overall: HealthStatus = report.failCount > 0 ? "FAIL" : report.warnCount > 0 ? "WARN" : "OK";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Administration", href: "/administration" }, { label: "Démonstration" }]}
        title="État du système / démonstration"
        description="Vérification technique du scénario BU-2026-001 de bout en bout. Chaque ligne exécute une vraie requête ou un vrai service."
        meta={<Badge tone="gold">DÉMO</Badge>}
      />

      {!env.DEMO_MODE ? (
        /*
         * Easy to hit and expensive to discover late: `npm run start` sets NODE_ENV=production,
         * under which DEMO_MODE defaults to OFF (lib/env.ts, secure by default). The presenter
         * then reaches this page and finds every control greyed out. The health table below
         * would still read 13/13, so the banner has to say it.
         */
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
          <p className="text-card-title text-warning-strong">Commandes de démonstration désactivées</p>
          <p className="mt-1 text-caption leading-relaxed text-secondary">
            <code className="font-mono">DEMO_MODE</code> est off sur cet environnement, donc la
            réinitialisation et le rejeu d&apos;anomalie sont bloqués. C&apos;est le comportement par défaut
            en production. Pour une machine de démonstration : ajoutez{" "}
            <code className="font-mono">DEMO_MODE=&quot;true&quot;</code> dans{" "}
            <code className="font-mono">.env.local</code>, puis relancez le serveur. La consultation du
            scénario ci-dessous fonctionne quand même.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Contrôles OK" value={report.okCount} icon={CircleCheck} />
        <StatCard label="Avertissements" value={report.warnCount} icon={TriangleAlert} />
        <StatCard label="Échecs" value={report.failCount} icon={CircleAlert} />
        <StatCard
          label="État global"
          value={overall === "OK" ? "Prêt" : overall === "WARN" ? "Dégradé" : "Bloqué"}
          hint={new Date(report.generatedAt).toLocaleTimeString("fr-FR")}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chaîne de bout en bout</CardTitle>
          <CardDescription>
            Ferme → Bâtiment → Lot → IoT → Données → KPI → Anomalie → Alerte → Action → Événement → Traçabilité → Produit → QR.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table caption="Résultats des contrôles de santé de la démonstration">
            <TableHeader>
              <TableRow>
                <TableHead>Contrôle</TableHead>
                <TableHead>État</TableHead>
                <TableHead>Détail mesuré</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.checks.map((check) => (
                <TableRow key={check.key}>
                  <TableCell className="whitespace-nowrap font-medium text-text">{check.label}</TableCell>
                  <TableCell>
                    <Badge tone={TONE[check.status]}>{HEALTH_STATUS_LABEL[check.status] ?? check.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-secondary">{check.detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Parcours de démonstration</CardTitle>
            <CardDescription>Raccourcis vers les étapes clés du scénario héros.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {heroLot ? (
              <>
                <DemoLink href="/dashboard" label="1 · Tableau de bord" />
                <DemoLink href={`/fermes/${farmId ?? ""}`} label="2 · Ferme Al Baraka" disabled={!farmId} />
                <DemoLink href={`/lots/${heroLot.id}`} label={`3 · Lot ${heroLot.code} — KPI, IoT, données`} />
                <DemoLink
                  href={openHeroAlert ? `/alertes/${openHeroAlert.id}` : "/alertes"}
                  label={openHeroAlert ? "4 · Alerte héros — explication et prise en compte" : "4 · Alertes (aucune alerte héros ouverte)"}
                  disabled={!openHeroAlert}
                />
                <DemoLink href={`/lots/${heroLot.id}/tracabilite`} label="5 · Traçabilité interne complète" />
                {productToken ? (
                  <a
                    href={publicPassportUrl(productToken.token)}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring font-mono text-caption text-bio-green hover:underline"
                  >
                    6 · Passeport public (produit) → {publicPassportUrl(productToken.token)}
                  </a>
                ) : (
                  <span className="text-caption text-critical-strong">Aucun passeport public actif.</span>
                )}
                <DemoLink href="/integrite" label="7 · Centre d'intégrité (démo étendue)" />
              </>
            ) : (
              <p className="text-xs text-critical-strong">Lot héros absent — réinitialisez la démonstration.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <AnomalyScenarioPanel enabled={env.DEMO_MODE} anomalyPresent={heroAnomalies.length > 0} />
          <DemoResetPanel enabled={env.DEMO_MODE} />
        </div>
      </div>
    </div>
  );
}

function DemoLink({ href, label, disabled }: { href: string; label: string; disabled?: boolean }) {
  if (disabled) {
    return <span className="text-secondary">{label}</span>;
  }
  return (
    <Link href={href} className="focus-ring text-text hover:text-bio-green hover:underline">
      {label}
    </Link>
  );
}
