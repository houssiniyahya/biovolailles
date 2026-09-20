import { repositories } from "../../data/repositories";
import { HERO_LOT_CODE } from "../../data/seed/seed-database";
import { AuthorizationError } from "../../domain/shared/errors";
import { can, canAccessModule } from "../../domain/shared/permissions";
import type { Session } from "../auth/session";
import { runIntegrityChecks } from "../integrity/checks";
import { getLotPerformanceOverview } from "../intelligence/performance-service";
import { resolvePublicPassport } from "../public/passport";
import { buildLotTraceabilityChain } from "../traceability/chain";

export type HealthStatus = "OK" | "WARN" | "FAIL";

export interface HealthCheck {
  key: string;
  label: string;
  status: HealthStatus;
  /** Always a concrete, measured statement ("12 lots, 8 fermes"), never a bare "OK". */
  detail: string;
}

export interface HealthReport {
  checks: HealthCheck[];
  okCount: number;
  warnCount: number;
  failCount: number;
  heroLotId: string | null;
  generatedAt: string;
}

/**
 * Demo/system validation checks (phase-10 brief §15). Every check runs a real query or a real
 * service call against the live database — nothing here reports a hardcoded "OK". Its purpose
 * is narrow and internal: catch a broken demonstration before a reviewer does.
 */
export async function runDemoHealthChecks(session: Session): Promise<HealthReport> {
  if (!can(session, "VIEW", "SETTINGS")) {
    throw new AuthorizationError("Vous n'avez pas les droits pour consulter l'état du système.");
  }

  const checks: HealthCheck[] = [];
  const add = (key: string, label: string, status: HealthStatus, detail: string) => {
    checks.push({ key, label, status, detail });
  };

  // 1 — Database reachability.
  let organizationCount = 0;
  try {
    organizationCount = (await repositories.organizations.list()).length;
    add("database", "Base de données", "OK", "Connexion établie, requêtes exécutées.");
  } catch (error) {
    add("database", "Base de données", "FAIL", error instanceof Error ? error.message : "Requête impossible.");
    return summarize(checks, null);
  }

  // 2 — Seed completeness.
  const [cooperatives, producers, farms, buildings, lots, users] = await Promise.all([
    repositories.cooperatives.list(),
    repositories.producers.list(),
    repositories.farms.list(),
    repositories.buildings.list(),
    repositories.lots.list(),
    repositories.users.list(),
  ]);
  const seedOk = organizationCount > 0 && cooperatives.length > 0 && farms.length > 0 && lots.length > 0 && users.length > 0;
  add(
    "seed",
    "Jeu de données",
    seedOk ? "OK" : "FAIL",
    `${organizationCount} organisation(s), ${cooperatives.length} coopérative(s), ${producers.length} producteur(s), ${farms.length} ferme(s), ${buildings.length} bâtiment(s), ${lots.length} lot(s), ${users.length} utilisateur(s).`
  );

  // 3 — Hero lot and its full identity chain.
  const heroLot = await repositories.lots.findByCode(HERO_LOT_CODE);
  if (!heroLot) {
    add("hero-lot", "Lot héros", "FAIL", `${HERO_LOT_CODE} introuvable — le scénario de démonstration est absent.`);
    return summarize(checks, null);
  }
  const heroBuilding = await repositories.buildings.findById(heroLot.buildingId);
  const heroFarm = heroBuilding ? await repositories.farms.findById(heroBuilding.farmId) : null;
  add(
    "hero-lot",
    "Lot héros",
    heroBuilding && heroFarm ? "OK" : "FAIL",
    heroBuilding && heroFarm
      ? `${heroLot.code} — ${heroFarm.name} / ${heroBuilding.code} · statut ${heroLot.status} · ${heroLot.currentPopulation.toLocaleString("fr-FR")} sujets.`
      : `${heroLot.code} existe mais sa ferme ou son bâtiment ne résout pas.`
  );

  // 4 — IoT: devices, sensors and persisted measurements on the hero building.
  const devices = heroBuilding ? await repositories.devices.listByBuilding(heroBuilding.id) : [];
  const sensorLists = await Promise.all(devices.map((d) => repositories.sensors.listByDevice(d.id)));
  const sensorCount = sensorLists.flat().length;
  const heroMeasurements = heroBuilding ? await repositories.measurements.listByBuilding(heroBuilding.id) : [];
  add(
    "iot",
    "IoT",
    devices.length > 0 && sensorCount > 0 && heroMeasurements.length > 0 ? "OK" : "FAIL",
    `${devices.length} appareil(s), ${sensorCount} capteur(s), ${heroMeasurements.length} mesure(s) persistée(s) sur ${heroBuilding?.code ?? "—"}.`
  );

  // 5 — KPI / performance computed from those records.
  const kpis = await getLotPerformanceOverview(heroLot.id);
  const kpisWithValue = kpis.filter((k) => k.result.value !== null);
  add(
    "kpi",
    "KPI / performance",
    kpisWithValue.length > 0 ? "OK" : "WARN",
    `${kpisWithValue.length}/${kpis.length} KPI calculable(s) : ${kpisWithValue.map((k) => k.result.label).join(", ") || "aucun"}.`
  );

  // 6 — Anomalies raised by the rules engine on the hero lot.
  const anomalies = await repositories.anomalies.listByLot(heroLot.id);
  add(
    "anomaly",
    "Anomalie",
    anomalies.length > 0 ? "OK" : "FAIL",
    anomalies.length > 0
      ? `${anomalies.length} anomalie(s) détectée(s), dont « ${anomalies[0].explanation.what} ».`
      : "Aucune anomalie sur le lot héros — le moteur de règles n'a rien produit."
  );

  // 7 — Alerts linked 1:1 to those anomalies.
  const alerts = (await Promise.all(anomalies.map((a) => repositories.alerts.findByAnomalyId(a.id)))).filter((a) => a !== null);
  add(
    "alert",
    "Alerte",
    alerts.length === anomalies.length && alerts.length > 0 ? "OK" : anomalies.length === 0 ? "FAIL" : "WARN",
    `${alerts.length} alerte(s) pour ${anomalies.length} anomalie(s) · statuts : ${[...new Set(alerts.map((a) => a.status))].join(", ") || "—"}.`
  );

  // 8 — Action pipeline. Both states are demo-ready: an alert still OPEN is what the reviewer
  // acknowledges live (brief §20 step 10); an alert already actioned proves the same pipeline ran.
  const actionLists = await Promise.all(alerts.map((a) => repositories.actionRecords.listByAlert(a.id)));
  const actionCount = actionLists.flat().length;
  const openAlerts = alerts.filter((a) => a.status === "OPEN").length;
  add(
    "action",
    "Action",
    actionCount > 0 || openAlerts > 0 ? "OK" : "WARN",
    actionCount > 0
      ? `${actionCount} action(s) enregistrée(s) sur le lot héros.`
      : `${openAlerts} alerte(s) ouverte(s), prêtes à être prises en compte pendant la démonstration.`
  );

  // 9 — Traceability chain, walked through the real relations table.
  const chain = await buildLotTraceabilityChain(heroLot.id, session);
  const stageTypes = new Set(chain.nodes.map((n) => n.type));
  const requiredStages = ["COLLECTION", "SLAUGHTER_BATCH", "TRANSFORMATION_BATCH", "PRODUCT"] as const;
  const missingStages = requiredStages.filter((s) => !stageTypes.has(s));
  add(
    "traceability",
    "Traçabilité",
    missingStages.length === 0 ? "OK" : "FAIL",
    missingStages.length === 0
      ? `${chain.nodes.length} nœud(s), ${chain.edges.length} relation(s) : collecte → abattage → transformation → produit.`
      : `Étapes manquantes dans la chaîne : ${missingStages.join(", ")}.`
  );

  // 10 — QR: resolve a real token through the real public service.
  const tokens = await repositories.qrTokens.listByLot(heroLot.id);
  const activeTokens = tokens.filter((t) => t.active);
  const resolved = activeTokens.length > 0 ? await resolvePublicPassport(activeTokens[0].token) : null;
  add(
    "qr",
    "QR / passeport public",
    resolved ? "OK" : "FAIL",
    resolved
      ? `${activeTokens.length}/${tokens.length} jeton(s) actif(s) · passeport résolu : ${resolved.publicStatus}${resolved.isDemoData ? " (données de démonstration)" : ""}.`
      : "Aucun jeton actif ne résout vers un passeport public."
  );

  // 11 — RBAC invariants, evaluated against the central matrix.
  const rbacFailures: string[] = [];
  const technician = { role: "TECHNICIAN" as const, scopeType: "FARM" as const, scopeId: "x" };
  const auditor = { role: "AUDITOR" as const, scopeType: "GLOBAL" as const, scopeId: null };
  if (canAccessModule(technician, "USERS")) rbacFailures.push("TECHNICIAN accède à USERS");
  if (canAccessModule(technician, "SETTINGS")) rbacFailures.push("TECHNICIAN accède à SETTINGS");
  if (can(auditor, "EDIT", "LOTS")) rbacFailures.push("AUDITOR peut modifier un lot");
  if (can(auditor, "CREATE", "TRACEABILITY")) rbacFailures.push("AUDITOR peut créer un passeport");
  if (can(null, "VIEW", "LOTS")) rbacFailures.push("Un visiteur non authentifié accède aux lots");
  add(
    "rbac",
    "RBAC",
    rbacFailures.length === 0 ? "OK" : "FAIL",
    rbacFailures.length === 0
      ? "Invariants de la matrice de permissions vérifiés (technicien, auditeur, public)."
      : rbacFailures.join(" · ")
  );

  // 12 — Audit trail attached to the hero lot.
  const heroAudit = await repositories.auditLog.search({ relatedLotId: heroLot.id }, 500);
  add(
    "audit",
    "Audit",
    heroAudit.length > 0 ? "OK" : "FAIL",
    `${heroAudit.length} entrée(s) d'audit liée(s) au lot héros · types : ${[...new Set(heroAudit.map((e) => e.entityType))].join(", ") || "—"}.`
  );

  // 13 — Integrity engine (brief §14): status must come from the real checks.
  //
  // The release-candidate bar is zero CRITICALs anywhere (phase-13 brief §4), so any critical
  // now fails this check — one on the hero lot is named explicitly, since that is the one that
  // would break the demonstration itself. The seed still plants deliberate WARNING-level
  // quality defects (QUALITY_DEMO_OVERRIDES in data/seed/generators/lots.ts) so the engine has
  // something true to find; warnings are expected and do not fail.
  const integrity = await runIntegrityChecks(session);
  const criticals = integrity.issues.filter((i) => i.severity === "CRITICAL");
  const heroCriticals = criticals.filter((i) => i.entityId === heroLot.id);
  const otherCriticals = criticals.filter((i) => i.entityId !== heroLot.id);
  const integrityStatus: HealthStatus = criticals.length > 0 ? "FAIL" : "OK";
  add(
    "integrity",
    "Intégrité",
    integrityStatus,
    `${integrity.statusPercent}% · ${integrity.checksPassed}/${integrity.checksRun} vérifications passées · ` +
      (heroCriticals.length > 0
        ? `${heroCriticals.length} problème(s) critique(s) sur le lot héros : ${heroCriticals.map((i) => i.code).join(", ")}.`
        : otherCriticals.length > 0
          ? `lot héros conforme, mais ${otherCriticals.length} problème(s) critique(s) ailleurs : ${otherCriticals.map((i) => i.code).join(", ")}.`
          : `aucun problème critique · ${integrity.warningCount} avertissement(s) de qualité attendu(s).`)
  );

  return summarize(checks, heroLot.id);
}

function summarize(checks: HealthCheck[], heroLotId: string | null): HealthReport {
  return {
    checks,
    okCount: checks.filter((c) => c.status === "OK").length,
    warnCount: checks.filter((c) => c.status === "WARN").length,
    failCount: checks.filter((c) => c.status === "FAIL").length,
    heroLotId,
    generatedAt: new Date().toISOString(),
  };
}
