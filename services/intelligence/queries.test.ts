import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { AuthorizationError, NotFoundError } from "../../domain/shared/errors";
import { createTestSession } from "../production/test-support";
import { getAlertDetail, listAlertsInScope, listAnomaliesInScope } from "./queries";

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

async function seedFarmWithAlert(suffix: string) {
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
    ruleId: rule.id, measurementId: null, kpiValueId: null, lotId: lot.id, buildingId: null,
    severity: "WARNING", observedValue: 10, referenceValue: 0, deviationPercent: 10, unit: "sujets",
    confidence: "MEDIUM", explanation: EXPLANATION, detectedAt: "2026-08-16T00:00:00.000Z", status: "OPEN",
  });
  const alert = await repositories.alerts.create({ anomalyId: anomaly.id, status: "OPEN", assignedTo: null, raisedAt: "2026-08-16T00:00:00.000Z", resolvedAt: null });
  return { lot, farm, building, anomaly, alert };
}

describe("listAnomaliesInScope", () => {
  it("GLOBAL scope sees anomalies from every farm", async () => {
    const a = await seedFarmWithAlert("QRY1");
    const b = await seedFarmWithAlert("QRY2");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QRY1admin");
    const anomalies = await listAnomaliesInScope(admin);
    const ids = anomalies.map((x) => x.id);
    expect(ids).toContain(a.anomaly.id);
    expect(ids).toContain(b.anomaly.id);
  });

  it("FARM scope only sees its own farm's anomalies — never a sibling farm's", async () => {
    const own = await seedFarmWithAlert("QRY3");
    const other = await seedFarmWithAlert("QRY4");
    const farmManager = await createTestSession("FARM_MANAGER", "FARM", own.farm.id, "QRY3fm");
    const anomalies = await listAnomaliesInScope(farmManager);
    const ids = anomalies.map((x) => x.id);
    expect(ids).toContain(own.anomaly.id);
    expect(ids).not.toContain(other.anomaly.id);
  });
});

describe("listAlertsInScope", () => {
  it("hydrates each alert with its rule, lot code, farm and building names", async () => {
    const { lot, farm, building, alert } = await seedFarmWithAlert("QRY5");
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QRY5admin");
    const entries = await listAlertsInScope(admin);
    const entry = entries.find((e) => e.alert.id === alert.id);
    expect(entry?.lotCode).toBe(lot.code);
    expect(entry?.farmName).toBe(farm.name);
    expect(entry?.buildingCode).toBe(building.code);
    expect(entry?.rule?.name).toContain("QRY5");
  });
});

describe("getAlertDetail", () => {
  it("returns the alert with its action history for a caller in scope", async () => {
    const { farm, alert } = await seedFarmWithAlert("QRY6");
    const farmManager = await createTestSession("FARM_MANAGER", "FARM", farm.id, "QRY6fm");
    const detail = await getAlertDetail(alert.id, farmManager);
    expect(detail.alert.id).toBe(alert.id);
    expect(detail.actions).toEqual([]);
  });

  it("throws NotFoundError for an unknown alert id", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QRY7admin");
    await expect(getAlertDetail("no-such-alert", admin)).rejects.toThrow(NotFoundError);
  });

  it("throws AuthorizationError for a caller outside the alert's scope", async () => {
    const { alert } = await seedFarmWithAlert("QRY8");
    const outsider = await createTestSession("FARM_MANAGER", "FARM", "some-other-farm-id", "QRY8fm");
    await expect(getAlertDetail(alert.id, outsider)).rejects.toThrow(AuthorizationError);
  });
});
