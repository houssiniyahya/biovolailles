import { repositories } from "../../data/repositories";
import { RULE_DEFINITIONS, type RuleCode } from "../../domain/intelligence/rule-definitions";
import {
  evaluateFeedDeviation,
  evaluatePerformanceDecline,
  evaluatePopulationInconsistency,
  evaluateStaleSensor,
  evaluateTemperatureRange,
  type BuildingContext,
  type LotContext,
  type RuleTriggerResult,
} from "../../domain/intelligence/rule-engine";
import { reconcilePopulation } from "../../domain/production/reconciliation";
import { can } from "../../domain/shared/permissions";
import { AuthorizationError, NotFoundError } from "../../domain/shared/errors";
import type { Anomaly, Rule } from "../../domain/intelligence/types";
import { recordAudit } from "../audit/record";
import type { Session } from "../auth/session";
import { assertInScope, resolveBuildingHierarchy, resolveLotHierarchy } from "../identity/scope-check";
import { getLotOrThrow } from "../production/lot";
import { ageAdjustedFeedReference, currentGrowthRate, fetchLotRecords, persistKpiEvidence, rollingPeriod } from "./kpi-service";

/**
 * Feed records are spaced ~4 days apart (data/seed/generators/production-data.ts). A 7-day
 * window aliases against that cadence — depending on a lot's own start-date phase, it can
 * arbitrarily catch 1 or 2 reference records, swinging the reference a lot for lots that
 * are otherwise perfectly on their expected curve. An 8-day window (two full cadences)
 * reliably captures 2 reference records regardless of phase — this only widens the rule's
 * own internal comparison window, not the KPI cards' displayed "7 derniers jours" period.
 */
const FEED_RULE_PERIOD_DAYS = 8;
const FEED_THRESHOLD_PERCENT = RULE_DEFINITIONS.FEED_DEVIATION_ABOVE_REFERENCE.condition.threshold;
const PERF_FEED_THRESHOLD_PERCENT = RULE_DEFINITIONS.PERFORMANCE_DECLINE.condition.threshold;
const PERF_GROWTH_DECLINE_THRESHOLD_PERCENT = Math.abs(RULE_DEFINITIONS.PERFORMANCE_DECLINE.condition.secondaryThreshold ?? 10);
const STALE_THRESHOLD_MINUTES = RULE_DEFINITIONS.STALE_SENSOR_DATA.condition.threshold;
const TEMPERATURE_RANGE = {
  min: RULE_DEFINITIONS.TEMPERATURE_OUT_OF_RANGE.condition.min ?? 18,
  max: RULE_DEFINITIONS.TEMPERATURE_OUT_OF_RANGE.condition.max ?? 33,
};

export interface DetectionSummary {
  created: Anomaly[];
  evaluated: RuleCode[];
}

/** Idempotent lookup of a rule's persisted row — so anomalies.ruleId always points at something real, without a separate seed dependency. */
export async function findOrCreateRule(code: RuleCode): Promise<Rule> {
  const spec = RULE_DEFINITIONS[code];
  const existing = await repositories.rules.findByName(spec.name);
  if (existing) return existing;
  return repositories.rules.create({
    name: spec.name,
    target: spec.target,
    condition: spec.condition,
    severity: spec.severity,
    active: spec.active,
    description: spec.description,
    explanationTemplate: spec.explanationTemplate,
  });
}

/** Detection is idempotent — re-running it must not spam duplicate OPEN anomalies for the same still-unresolved condition. */
function hasOpenAnomaly(existing: Anomaly[], ruleId: string): boolean {
  return existing.some((a) => a.ruleId === ruleId && a.status === "OPEN");
}

async function persistTrigger(
  trigger: RuleTriggerResult,
  ruleId: string,
  target: { lotId?: string; buildingId?: string; measurementId?: string; kpiValueId?: string },
  detectedAt: string
): Promise<Anomaly> {
  const anomaly = await repositories.anomalies.create({
    ruleId,
    measurementId: target.measurementId ?? null,
    kpiValueId: target.kpiValueId ?? null,
    lotId: target.lotId ?? null,
    buildingId: target.buildingId ?? null,
    severity: trigger.severity,
    observedValue: trigger.observedValue,
    referenceValue: trigger.referenceValue,
    deviationPercent: trigger.deviationPercent,
    unit: trigger.unit,
    confidence: trigger.confidence,
    explanation: trigger.explanation,
    detectedAt,
    status: "OPEN",
  });
  await repositories.alerts.create({ anomalyId: anomaly.id, status: "OPEN", assignedTo: null, raisedAt: detectedAt, resolvedAt: null });
  return anomaly;
}

/**
 * Evaluates the three lot-scoped rules (feed deviation, performance decline, population
 * inconsistency) against a lot's real persisted records and persists any new anomaly+alert
 * pair — the hero scenario (phase-6 brief §10-§11, §21) runs through exactly this path, not
 * a special case. Gated by the same ANOMALIES:VALIDATE permission TECHNICIAN already has
 * (domain/shared/permissions.ts) — re-running it is safe (idempotent) and requires no schema
 * or matrix change.
 */
export async function runLotDetection(lotId: string, session: Session, now: Date = new Date()): Promise<DetectionSummary> {
  if (!can(session, "VALIDATE", "ANOMALIES")) {
    throw new AuthorizationError("Vous n'avez pas les droits pour lancer une évaluation des règles.");
  }
  const lot = await getLotOrThrow(lotId);
  const path = await resolveLotHierarchy(lotId);
  assertInScope(session, path);

  const building = await repositories.buildings.findById(lot.buildingId);
  if (!building) throw new NotFoundError("Building", lot.buildingId);
  const farm = await repositories.farms.findById(building.farmId);
  if (!farm) throw new NotFoundError("Farm", building.farmId);
  const context: LotContext = { lotCode: lot.code, farmName: farm.name, buildingCode: building.code };

  const [records, existing] = await Promise.all([fetchLotRecords(lotId), repositories.anomalies.listByLot(lotId)]);
  const created: Anomaly[] = [];
  const evaluated: RuleCode[] = [];
  const detectedAt = now.toISOString();
  const currentPeriod = rollingPeriod(now, FEED_RULE_PERIOD_DAYS);

  evaluated.push("FEED_DEVIATION_ABOVE_REFERENCE");
  let feedDeviationPercent: number | null = null;
  if (lot.startedAt) {
    const { currentKg, referenceKg, dataStatus } = ageAdjustedFeedReference(records.feed, lot.startedAt, now, FEED_RULE_PERIOD_DAYS);
    if (referenceKg !== null && dataStatus !== null) {
      feedDeviationPercent = Math.round(((currentKg - referenceKg) / referenceKg) * 1000) / 10;
      const trigger = evaluateFeedDeviation(currentKg, referenceKg, context, currentPeriod.label, dataStatus, FEED_THRESHOLD_PERCENT);
      if (trigger) {
        const rule = await findOrCreateRule("FEED_DEVIATION_ABOVE_REFERENCE");
        if (!hasOpenAnomaly(existing, rule.id)) {
          const evidence = await persistKpiEvidence(lotId, "FEED_CONSUMPTION", currentKg, currentPeriod, dataStatus, now);
          created.push(await persistTrigger(trigger, rule.id, { lotId, kpiValueId: evidence.id }, detectedAt));
        }
      }
    }
  }

  evaluated.push("PERFORMANCE_DECLINE");
  if (feedDeviationPercent !== null) {
    const { current: currentGrowth, previous: previousGrowth } = currentGrowthRate(records.weight);
    if (currentGrowth !== null && previousGrowth !== null && previousGrowth !== 0) {
      const growthDeviationPercent = Math.round(((currentGrowth - previousGrowth) / Math.abs(previousGrowth)) * 1000) / 10;
      const latestWeightRecord = [...records.weight].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      )[0];
      const trigger = evaluatePerformanceDecline(
        feedDeviationPercent,
        growthDeviationPercent,
        context,
        currentPeriod.label,
        latestWeightRecord.dataStatus,
        { feedThresholdPercent: PERF_FEED_THRESHOLD_PERCENT, growthDeclineThresholdPercent: PERF_GROWTH_DECLINE_THRESHOLD_PERCENT }
      );
      if (trigger) {
        const rule = await findOrCreateRule("PERFORMANCE_DECLINE");
        if (!hasOpenAnomaly(existing, rule.id)) {
          created.push(await persistTrigger(trigger, rule.id, { lotId }, detectedAt));
        }
      }
    }
  }

  evaluated.push("POPULATION_INCONSISTENCY");
  const totalMortality = records.mortality.reduce((sum, r) => sum + r.count, 0);
  const reconciliation = reconcilePopulation({
    initialPopulation: lot.initialPopulation,
    totalMortality,
    totalExits: 0,
    totalEntries: 0,
    recordedPopulation: lot.currentPopulation,
  });
  const populationTrigger = evaluatePopulationInconsistency(reconciliation, context, lot.dataStatus, detectedAt);
  if (populationTrigger) {
    const rule = await findOrCreateRule("POPULATION_INCONSISTENCY");
    if (!hasOpenAnomaly(existing, rule.id)) {
      created.push(await persistTrigger(populationTrigger, rule.id, { lotId }, detectedAt));
    }
  }

  if (created.length > 0) {
    await recordAudit({
      actorId: session.userId,
      entityType: "lot",
      entityId: lotId,
      field: "anomaly_detection",
      oldValue: null,
      newValue: `${created.length} anomalie(s)`,
      reason: "Évaluation des règles d'anomalie",
      relatedLotId: lotId,
      relatedEventId: null,
    });
  }

  return { created, evaluated };
}

/**
 * Evaluates the two building-scoped rules (temperature range, stale sensor data) against a
 * building's IoT devices — reuses measurements.latestByBuilding (phase-4) for one query
 * instead of looping per sensor.
 */
export async function runBuildingDetection(buildingId: string, session: Session, now: Date = new Date()): Promise<DetectionSummary> {
  if (!can(session, "VALIDATE", "ANOMALIES")) {
    throw new AuthorizationError("Vous n'avez pas les droits pour lancer une évaluation des règles.");
  }
  const path = await resolveBuildingHierarchy(buildingId);
  assertInScope(session, path);

  const building = await repositories.buildings.findById(buildingId);
  if (!building) throw new NotFoundError("Building", buildingId);
  const farm = await repositories.farms.findById(building.farmId);
  if (!farm) throw new NotFoundError("Farm", building.farmId);
  const context: BuildingContext = { farmName: farm.name, buildingCode: building.code };

  const devices = await repositories.devices.listByBuilding(buildingId);
  const sensorsByDevice = await Promise.all(devices.map((d) => repositories.sensors.listByDevice(d.id)));
  const sensorById = new Map(sensorsByDevice.flat().map((s) => [s.id, s]));
  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const [latestReadings, existing] = await Promise.all([
    repositories.measurements.latestByBuilding(buildingId),
    repositories.anomalies.listByBuilding(buildingId),
  ]);

  const created: Anomaly[] = [];
  const evaluated: RuleCode[] = ["TEMPERATURE_OUT_OF_RANGE", "STALE_SENSOR_DATA"];
  const detectedAt = now.toISOString();

  for (const reading of latestReadings) {
    const sensor = sensorById.get(reading.sensorId);
    if (!sensor) continue;
    const device = deviceById.get(sensor.deviceId);
    if (!device) continue;

    if (sensor.sensorType === "TEMPERATURE") {
      const trigger = evaluateTemperatureRange(reading, context, TEMPERATURE_RANGE);
      if (trigger) {
        const rule = await findOrCreateRule("TEMPERATURE_OUT_OF_RANGE");
        if (!hasOpenAnomaly(existing, rule.id)) {
          created.push(await persistTrigger(trigger, rule.id, { buildingId, measurementId: reading.id }, detectedAt));
        }
      }
    }

    if (device.status === "ONLINE") {
      const trigger = evaluateStaleSensor(reading, context, now, STALE_THRESHOLD_MINUTES);
      if (trigger) {
        const rule = await findOrCreateRule("STALE_SENSOR_DATA");
        if (!hasOpenAnomaly(existing, rule.id)) {
          created.push(await persistTrigger(trigger, rule.id, { buildingId, measurementId: reading.id }, detectedAt));
        }
      }
    }
  }

  if (created.length > 0) {
    await recordAudit({
      actorId: session.userId,
      entityType: "building",
      entityId: buildingId,
      field: "anomaly_detection",
      oldValue: null,
      newValue: `${created.length} anomalie(s)`,
      reason: "Évaluation des règles d'anomalie",
      relatedLotId: null,
      relatedEventId: null,
    });
  }

  return { created, evaluated };
}
