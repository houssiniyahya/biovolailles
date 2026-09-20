import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { AuthorizationError, ValidationError } from "../../domain/shared/errors";
import { createTestSession } from "../production/test-support";
import { acknowledgeAlert, dismissAlert, resolveAlert } from "./alerts";

const EXPLANATION = {
  what: "Test",
  where: "Test",
  when: "2026-08-16T00:00:00.000Z",
  whatChanged: "Test",
  comparedTo: "Test",
  byHowMuch: "Test",
  basedOnData: "Test",
  whyTriggered: "Test",
};

async function seedLotWithOpenAlert(suffix: string) {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({ cooperativeId: coop.id, name: `Producer ${suffix}`, contactPhone: null, contactEmail: null });
  const farm = await repositories.farms.create({ producerId: producer.id, name: `Farm ${suffix}`, city: "City", region: "R", geoLat: null, geoLng: null });
  const building = await repositories.buildings.create({ farmId: farm.id, code: `BAT-${suffix}`, name: "Building", capacity: 5000, zoneType: "ELEVAGE" });
  const lot = await repositories.lots.create({
    buildingId: building.id,
    code: `LOT-${suffix}`,
    species: "Poulet",
    breed: "Ross",
    status: "ACTIF",
    initialPopulation: 1000,
    currentPopulation: 1000,
    plannedStartAt: null,
    startedAt: "2026-07-01T00:00:00.000Z",
    endedAt: null,
    dataStatus: "SIMULATION",
  });
  const rule = await repositories.rules.create({
    name: `Rule ${suffix}`,
    target: "population",
    condition: { operator: "GT", threshold: 0 },
    severity: "WARNING",
    active: true,
    description: "Test rule",
    explanationTemplate: "Test",
  });
  const anomaly = await repositories.anomalies.create({
    ruleId: rule.id,
    measurementId: null,
    kpiValueId: null,
    lotId: lot.id,
    buildingId: null,
    severity: "WARNING",
    observedValue: 10,
    referenceValue: 0,
    deviationPercent: 10,
    unit: "sujets",
    confidence: "MEDIUM",
    explanation: EXPLANATION,
    detectedAt: "2026-08-16T00:00:00.000Z",
    status: "OPEN",
  });
  const alert = await repositories.alerts.create({ anomalyId: anomaly.id, status: "OPEN", assignedTo: null, raisedAt: "2026-08-16T00:00:00.000Z", resolvedAt: null });
  return { lot, farm, rule, anomaly, alert };
}

describe("acknowledgeAlert", () => {
  it("moves an OPEN alert to ACKNOWLEDGED and records the action through the existing action/event/audit architecture", async () => {
    const { lot, farm, alert } = await seedLotWithOpenAlert("ALT1");
    const farmManager = await createTestSession("FARM_MANAGER", "FARM", farm.id, "ALT1fm");

    const updated = await acknowledgeAlert(alert.id, farmManager, "Vu, je vérifie.");
    expect(updated.status).toBe("ACKNOWLEDGED");

    const actions = await repositories.actionRecords.listByAlert(alert.id);
    expect(actions).toHaveLength(1);
    expect(actions[0].actionType).toBe("ACKNOWLEDGE_ALERT");
    expect(actions[0].description).toBe("Vu, je vérifie.");
    expect(actions[0].actorId).toBe(farmManager.userId);

    const events = await repositories.lotEvents.listByLot(lot.id);
    expect(events.some((e) => e.eventType === "ALERT_ACTION")).toBe(true);

    const auditEntries = await repositories.auditLog.list();
    expect(auditEntries.some((entry) => entry.entityType === "alert" && entry.entityId === alert.id)).toBe(true);
  });

  it("rejects a role without ALERTS:ACKNOWLEDGE (AUDITOR is read-only)", async () => {
    const { alert } = await seedLotWithOpenAlert("ALT2");
    const auditor = await createTestSession("AUDITOR", "GLOBAL", null, "ALT2aud");
    await expect(acknowledgeAlert(alert.id, auditor)).rejects.toThrow(AuthorizationError);
  });

  it("rejects a caller outside the anomaly's own scope", async () => {
    const { alert } = await seedLotWithOpenAlert("ALT3");
    const outsider = await createTestSession("FARM_MANAGER", "FARM", "some-other-farm-id", "ALT3fm");
    await expect(acknowledgeAlert(alert.id, outsider)).rejects.toThrow(AuthorizationError);
  });
});

describe("resolveAlert", () => {
  it("resolves an OPEN alert directly, sets resolvedAt, and moves the anomaly to REVIEWED", async () => {
    const { farm, alert, anomaly } = await seedLotWithOpenAlert("ALT4");
    const farmManager = await createTestSession("FARM_MANAGER", "FARM", farm.id, "ALT4fm");

    const updated = await resolveAlert(alert.id, farmManager, "Corrigé.");
    expect(updated.status).toBe("RESOLVED");
    expect(updated.resolvedAt).not.toBeNull();

    const anomalyAfter = await repositories.anomalies.findById(anomaly.id);
    expect(anomalyAfter?.status).toBe("REVIEWED");
  });

  it("also resolves an already-ACKNOWLEDGED alert", async () => {
    const { farm, alert } = await seedLotWithOpenAlert("ALT5");
    const farmManager = await createTestSession("FARM_MANAGER", "FARM", farm.id, "ALT5fm");
    await acknowledgeAlert(alert.id, farmManager);
    const updated = await resolveAlert(alert.id, farmManager);
    expect(updated.status).toBe("RESOLVED");
  });

  it("rejects resolving an alert that is already RESOLVED (invalid state transition, fails safe)", async () => {
    const { farm, alert } = await seedLotWithOpenAlert("ALT6");
    const farmManager = await createTestSession("FARM_MANAGER", "FARM", farm.id, "ALT6fm");
    await resolveAlert(alert.id, farmManager);
    await expect(resolveAlert(alert.id, farmManager)).rejects.toThrow(ValidationError);
  });
});

describe("dismissAlert", () => {
  it("dismisses an OPEN alert and moves the anomaly to DISMISSED", async () => {
    const { farm, alert, anomaly } = await seedLotWithOpenAlert("ALT7");
    const farmManager = await createTestSession("FARM_MANAGER", "FARM", farm.id, "ALT7fm");
    const updated = await dismissAlert(alert.id, farmManager, "Faux positif.");
    expect(updated.status).toBe("DISMISSED");
    const anomalyAfter = await repositories.anomalies.findById(anomaly.id);
    expect(anomalyAfter?.status).toBe("DISMISSED");
  });
});
