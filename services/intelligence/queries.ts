import { repositories } from "../../data/repositories";
import type { ActionRecord, Alert, Anomaly, Rule } from "../../domain/intelligence/types";
import { NotFoundError } from "../../domain/shared/errors";
import { isGlobalScope, type ScopeContext } from "../../domain/shared/scope";
import { listBuildingsInScope } from "../identity/queries";
import { assertInScope, resolveBuildingHierarchy, resolveLotHierarchy } from "../identity/scope-check";
import type { Session } from "../auth/session";
import { listLotsInScope, listLotsWithContext } from "../production/lot-queries";

/**
 * Scope-filtered reads over the anomaly/alert tables — same pattern as every other
 * `listXInScope` in this codebase (services/identity/queries.ts, services/production/lot-queries.ts,
 * services/iot/queries.ts): fetch the full table once, narrow by the caller's already-scoped
 * lot/building id sets. No second scope model.
 */
export async function listAnomaliesInScope(scope: ScopeContext): Promise<Anomaly[]> {
  const all = await repositories.anomalies.list();
  if (isGlobalScope(scope)) return all;
  const [lots, buildings] = await Promise.all([listLotsInScope(scope), listBuildingsInScope(scope)]);
  const lotIds = new Set(lots.map((l) => l.id));
  const buildingIds = new Set(buildings.map((b) => b.id));
  return all.filter((a) => (a.lotId && lotIds.has(a.lotId)) || (a.buildingId && buildingIds.has(a.buildingId)));
}

export interface AlertWithContext {
  alert: Alert;
  anomaly: Anomaly;
  rule: Rule | null;
  lotId: string | null;
  lotCode: string | null;
  buildingId: string | null;
  buildingCode: string | null;
  farmId: string | null;
  farmName: string | null;
}

async function hydrateAlerts(anomalies: Anomaly[]): Promise<AlertWithContext[]> {
  if (anomalies.length === 0) return [];
  const anomalyIds = anomalies.map((a) => a.id);
  const [alerts, rules, lotsWithContext, buildings, farms] = await Promise.all([
    repositories.alerts.listByAnomalyIds(anomalyIds),
    repositories.rules.list(),
    listLotsWithContext({ scopeType: "GLOBAL", scopeId: null }),
    repositories.buildings.list(),
    repositories.farms.list(),
  ]);
  const anomalyById = new Map(anomalies.map((a) => [a.id, a]));
  const ruleById = new Map(rules.map((r) => [r.id, r]));
  const lotById = new Map(lotsWithContext.map((l) => [l.id, l]));
  const buildingById = new Map(buildings.map((b) => [b.id, b]));
  const farmById = new Map(farms.map((f) => [f.id, f]));

  return alerts
    .map((alert): AlertWithContext | null => {
      const anomaly = anomalyById.get(alert.anomalyId);
      if (!anomaly) return null;
      const rule = ruleById.get(anomaly.ruleId) ?? null;

      if (anomaly.lotId) {
        const lot = lotById.get(anomaly.lotId);
        return {
          alert,
          anomaly,
          rule,
          lotId: anomaly.lotId,
          lotCode: lot?.code ?? null,
          buildingId: lot?.buildingId ?? null,
          buildingCode: lot?.buildingCode ?? null,
          farmId: lot?.farmId ?? null,
          farmName: lot?.farmName ?? null,
        };
      }
      if (anomaly.buildingId) {
        const building = buildingById.get(anomaly.buildingId);
        const farm = building ? farmById.get(building.farmId) : undefined;
        return {
          alert,
          anomaly,
          rule,
          lotId: null,
          lotCode: null,
          buildingId: anomaly.buildingId,
          buildingCode: building?.code ?? null,
          farmId: farm?.id ?? null,
          farmName: farm?.name ?? null,
        };
      }
      return { alert, anomaly, rule, lotId: null, lotCode: null, buildingId: null, buildingCode: null, farmId: null, farmName: null };
    })
    .filter((entry): entry is AlertWithContext => entry !== null);
}

export async function listAlertsInScope(scope: ScopeContext): Promise<AlertWithContext[]> {
  const anomalies = await listAnomaliesInScope(scope);
  return hydrateAlerts(anomalies);
}

export async function listAlertsForLot(lotId: string): Promise<AlertWithContext[]> {
  const anomalies = await repositories.anomalies.listByLot(lotId);
  return hydrateAlerts(anomalies);
}

export async function listAlertsForBuilding(buildingId: string): Promise<AlertWithContext[]> {
  const anomalies = await repositories.anomalies.listByBuilding(buildingId);
  return hydrateAlerts(anomalies);
}

export interface AlertDetail extends AlertWithContext {
  actions: ActionRecord[];
}

/** Full detail for the alert detail page (phase-6 brief §15) — scope-checked against the anomaly's own lot/building. */
export async function getAlertDetail(alertId: string, session: Session): Promise<AlertDetail> {
  const alert = await repositories.alerts.findById(alertId);
  if (!alert) throw new NotFoundError("Alert", alertId);
  const anomaly = await repositories.anomalies.findById(alert.anomalyId);
  if (!anomaly) throw new NotFoundError("Anomaly", alert.anomalyId);

  if (anomaly.lotId) {
    assertInScope(session, await resolveLotHierarchy(anomaly.lotId));
  } else if (anomaly.buildingId) {
    assertInScope(session, await resolveBuildingHierarchy(anomaly.buildingId));
  }

  const [hydrated, actions] = await Promise.all([hydrateAlerts([anomaly]), repositories.actionRecords.listByAlert(alertId)]);
  const context = hydrated[0];
  if (!context) throw new NotFoundError("Alert", alertId);
  return { ...context, actions };
}
