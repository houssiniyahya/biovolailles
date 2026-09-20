import { beforeAll, describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { DEMO_ACCOUNT_EMAIL } from "../../data/seed/generators/hierarchy";
import { HERO_LOT_CODE, seedDatabase, type SeedResult } from "../../data/seed/seed-database";
import type { Role } from "../../domain/shared/enums";
import { AuthorizationError } from "../../domain/shared/errors";
import type { Session } from "../auth/session";
import { runIntegrityChecks } from "../integrity/checks";
import { acknowledgeAlert } from "../intelligence/alerts";
import { listAlertsForLot } from "../intelligence/queries";
import { getLotPerformanceOverview } from "../intelligence/performance-service";
import { listBuildingsInScope, listFarmsInScope } from "../identity/queries";
import { listLotsInScope } from "../production/lot-queries";
import { resolvePublicPassport } from "../public/passport";
import { computeLotDataQuality } from "../quality/lot-quality";
import { buildLotTraceabilityChain } from "../traceability/chain";

/**
 * The phase-10 completion criterion (brief §1, §25) as one executable proof: BU-2026-001
 * travels the full chain — Farm → Building → Lot → Data → IoT → KPI → Anomaly → Alert →
 * Action → Event → Traceability → Product → QR passport — over the real seeded dataset,
 * with real persisted relationships and real permission checks at every hop.
 *
 * Seeded once for the whole file (the per-file temp database from vitest.setup.ts), because
 * the point is precisely that every assertion below reads the SAME dataset the demo uses.
 */
let seed: SeedResult;
const sessions = new Map<Role, Session>();

async function sessionFor(role: Role): Promise<Session> {
  const cached = sessions.get(role);
  if (cached) return cached;
  const user = await repositories.users.findByEmail(DEMO_ACCOUNT_EMAIL[role]);
  if (!user) throw new Error(`Demo user missing for ${role}`);
  const session: Session = {
    userId: user.id,
    role: user.role,
    scopeType: user.scopeType,
    scopeId: user.scopeId,
    isDemoSwitch: false,
  };
  sessions.set(role, session);
  return session;
}

beforeAll(async () => {
  seed = await seedDatabase();
}, 120_000);

describe("hero scenario — identity chain", () => {
  it("resolves Farm → Building → Lot as real persisted rows", async () => {
    const lot = await repositories.lots.findByCode(HERO_LOT_CODE);
    expect(lot).not.toBeNull();
    expect(lot!.id).toBe(seed.heroLotId);

    const building = await repositories.buildings.findById(lot!.buildingId);
    expect(building).not.toBeNull();

    const farm = await repositories.farms.findById(building!.farmId);
    expect(farm).not.toBeNull();
    expect(farm!.name).toBe("Ferme Al Baraka");

    const producer = await repositories.producers.findById(farm!.producerId);
    const cooperative = await repositories.producers
      .findById(farm!.producerId)
      .then((p) => repositories.cooperatives.findById(p!.cooperativeId));
    expect(producer).not.toBeNull();
    expect(cooperative).not.toBeNull();
  });
});

describe("hero scenario — data and IoT feed the model", () => {
  it("has structured production data of every type", async () => {
    const [feed, water, weight, mortality, environment] = await Promise.all([
      repositories.feedUsage.listByLot(seed.heroLotId),
      repositories.waterUsage.listByLot(seed.heroLotId),
      repositories.weightMeasurements.listByLot(seed.heroLotId),
      repositories.mortalityRecords.listByLot(seed.heroLotId),
      repositories.environmentMeasurements.listByLot(seed.heroLotId),
    ]);
    expect(feed.length).toBeGreaterThan(0);
    expect(water.length).toBeGreaterThan(0);
    expect(weight.length).toBeGreaterThan(0);
    expect(mortality.length).toBeGreaterThan(0);
    expect(environment.length).toBeGreaterThan(0);
  });

  it("has IoT devices, sensors and persisted measurements on the hero building", async () => {
    const lot = await repositories.lots.findById(seed.heroLotId);
    const devices = await repositories.devices.listByBuilding(lot!.buildingId);
    expect(devices.length).toBeGreaterThan(0);

    const sensors = (await Promise.all(devices.map((d) => repositories.sensors.listByDevice(d.id)))).flat();
    expect(sensors.length).toBeGreaterThan(0);

    const measurements = await repositories.measurements.listByBuilding(lot!.buildingId);
    expect(measurements.length).toBeGreaterThan(0);
    // Every measurement must trace back to a real sensor — the IoT tables are genuinely wired,
    // not a parallel set of display-only rows.
    const sensorIds = new Set(sensors.map((s) => s.id));
    expect(measurements.every((m) => sensorIds.has(m.sensorId))).toBe(true);
  });

  it("computes data quality and KPIs from those records", async () => {
    const quality = await computeLotDataQuality(seed.heroLotId);
    expect(quality.totalRecords).toBeGreaterThan(0);
    expect(quality.populationReconciliation.consistent).toBe(true);

    const kpis = await getLotPerformanceOverview(seed.heroLotId);
    expect(kpis.filter((k) => k.result.value !== null).length).toBeGreaterThan(0);
    // Every KPI carries its own formula — nothing is an unexplained number.
    expect(kpis.every((k) => k.result.formula.length > 0)).toBe(true);
  });
});

describe("hero scenario — anomaly → alert → action → event", () => {
  it("raised an explainable anomaly with a linked alert", async () => {
    const anomalies = await repositories.anomalies.listByLot(seed.heroLotId);
    expect(anomalies.length).toBeGreaterThan(0);

    const anomaly = anomalies[0];
    // The eight-question explanation must be fully populated — this is what makes the alert
    // defensible rather than a bare "anomaly detected" badge.
    for (const field of ["what", "where", "when", "whatChanged", "comparedTo", "byHowMuch", "basedOnData", "whyTriggered"] as const) {
      expect(anomaly.explanation[field].length).toBeGreaterThan(0);
    }

    const alert = await repositories.alerts.findByAnomalyId(anomaly.id);
    expect(alert).not.toBeNull();
    expect(alert!.status).toBe("OPEN");
  });

  it("a Farm Manager acknowledging the alert persists an action AND a lot event", async () => {
    const farmManager = await sessionFor("FARM_MANAGER");
    const alerts = await listAlertsForLot(seed.heroLotId);
    const open = alerts.find((a) => a.alert.status === "OPEN");
    expect(open).toBeDefined();

    const eventsBefore = await repositories.lotEvents.listByLot(seed.heroLotId);

    await acknowledgeAlert(open!.alert.id, farmManager, "Vérification terrain planifiée.");

    const updated = await repositories.alerts.findById(open!.alert.id);
    expect(updated!.status).toBe("ACKNOWLEDGED");

    const actions = await repositories.actionRecords.listByAlert(open!.alert.id);
    expect(actions).toHaveLength(1);
    expect(actions[0].actorId).toBe(farmManager.userId);
    expect(actions[0].description).toBe("Vérification terrain planifiée.");

    const eventsAfter = await repositories.lotEvents.listByLot(seed.heroLotId);
    expect(eventsAfter.length).toBe(eventsBefore.length + 1);
    const alertEvent = eventsAfter.find((e) => e.eventType === "ALERT_ACTION");
    expect(alertEvent).toBeDefined();
    expect(alertEvent!.actorId).toBe(farmManager.userId);

    const audit = await repositories.auditLog.search({ entityType: "alert", entityId: open!.alert.id });
    expect(audit.length).toBeGreaterThan(0);
  });

  it("refuses the same action from a role without ACKNOWLEDGE, and from outside scope", async () => {
    const auditor = await sessionFor("AUDITOR");
    const alerts = await listAlertsForLot(seed.heroLotId);
    await expect(acknowledgeAlert(alerts[0].alert.id, auditor)).rejects.toThrow(AuthorizationError);

    const outsider: Session = { userId: auditor.userId, role: "FARM_MANAGER", scopeType: "FARM", scopeId: "unrelated-farm", isDemoSwitch: false };
    await expect(acknowledgeAlert(alerts[0].alert.id, outsider)).rejects.toThrow(AuthorizationError);
  });
});

describe("hero scenario — traceability → product → QR passport", () => {
  it("walks the full downstream chain through the real relations table", async () => {
    const admin = await sessionFor("SUPER_ADMIN");
    const chain = await buildLotTraceabilityChain(seed.heroLotId, admin);
    const types = new Set(chain.nodes.map((n) => n.type));

    expect(types.has("COLLECTION")).toBe(true);
    expect(types.has("SLAUGHTER_BATCH")).toBe(true);
    expect(types.has("TRANSFORMATION_BATCH")).toBe(true);
    expect(types.has("PRODUCT")).toBe(true);
    expect(chain.edges.length).toBeGreaterThan(0);
    // Upstream identity context comes from the real hierarchy, not a fabricated origin record.
    expect(chain.upstream.map((u) => u.label)).toEqual(["Producteur", "Ferme", "Bâtiment"]);
  });

  it("the QR passport consumes that same chain and exposes only curated data", async () => {
    const passport = await resolvePublicPassport(seed.productTokenValue);
    expect(passport).not.toBeNull();
    expect(passport!.lotCode).toBe(HERO_LOT_CODE);
    expect(passport!.originFarmName).toBe("Ferme Al Baraka");
    expect(passport!.lineage.map((s) => s.name)).toContain("Collecte");
    expect(passport!.isDemoData).toBe(true);

    // Same leak guarantee as phase 9, re-asserted against the real hero dataset.
    const serialized = JSON.stringify(passport);
    expect(serialized).not.toContain(seed.heroLotId);
    expect(serialized).not.toContain(seed.productId);
    expect(serialized).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
  });
});

describe("hero scenario — RBAC changes the data itself", () => {
  it("gives each role a genuinely different slice of the same dataset", async () => {
    const [admin, coopManager, producer, farmManager, technician, auditor] = await Promise.all([
      sessionFor("SUPER_ADMIN"),
      sessionFor("COOP_MANAGER"),
      sessionFor("PRODUCER"),
      sessionFor("FARM_MANAGER"),
      sessionFor("TECHNICIAN"),
      sessionFor("AUDITOR"),
    ]);

    const counts = async (s: Session) => ({
      farms: (await listFarmsInScope(s)).length,
      buildings: (await listBuildingsInScope(s)).length,
      lots: (await listLotsInScope(s)).length,
    });

    const adminCounts = await counts(admin);
    const coopCounts = await counts(coopManager);
    const producerCounts = await counts(producer);
    const farmCounts = await counts(farmManager);
    const auditorCounts = await counts(auditor);

    // Strictly narrowing scopes — not merely "a different view of everything".
    expect(adminCounts.farms).toBeGreaterThan(coopCounts.farms);
    expect(coopCounts.farms).toBeGreaterThan(producerCounts.farms);
    expect(producerCounts.farms).toBeGreaterThanOrEqual(farmCounts.farms);
    expect(farmCounts.farms).toBe(1);
    expect(farmCounts.lots).toBeGreaterThan(0);

    // AUDITOR is global but read-only: same visibility as admin, no write rights.
    expect(auditorCounts.farms).toBe(adminCounts.farms);

    // The technician is farm-scoped like the farm manager.
    const technicianCounts = await counts(technician);
    expect(technicianCounts.farms).toBe(1);

    // The hero lot is visible to the roles that own it, and invisible outside that branch.
    const heroVisibleTo = async (s: Session) => (await listLotsInScope(s)).some((l) => l.id === seed.heroLotId);
    expect(await heroVisibleTo(admin)).toBe(true);
    expect(await heroVisibleTo(coopManager)).toBe(true);
    expect(await heroVisibleTo(producer)).toBe(true);
    expect(await heroVisibleTo(farmManager)).toBe(true);

    const outsider: Session = { userId: admin.userId, role: "FARM_MANAGER", scopeType: "FARM", scopeId: "unrelated-farm", isDemoSwitch: false };
    expect(await heroVisibleTo(outsider)).toBe(false);
  });
});

describe("hero scenario — integrity", () => {
  it("leaves the hero lot with zero CRITICAL integrity issues", async () => {
    const admin = await sessionFor("SUPER_ADMIN");
    const report = await runIntegrityChecks(admin);

    expect(report.checksRun).toBeGreaterThan(0);
    const heroCriticals = report.issues.filter((i) => i.severity === "CRITICAL" && i.entityId === seed.heroLotId);
    if (heroCriticals.length > 0) {
      // Surfaces the offending checks in the failure output rather than a bare count.
      throw new Error(
        `Hero lot has CRITICAL integrity issues:\n${heroCriticals.map((i) => `  ${i.code} — ${i.description}`).join("\n")}`
      );
    }
    expect(heroCriticals).toHaveLength(0);
  }, 120_000);

  it("ships with zero CRITICAL integrity issues anywhere in the seeded dataset", async () => {
    const admin = await sessionFor("SUPER_ADMIN");
    const report = await runIntegrityChecks(admin);

    // The release-candidate bar (phase-13 brief §4). The seed still plants deliberate
    // data-quality defects (QUALITY_DEMO_OVERRIDES in data/seed/generators/lots.ts) so the
    // engine has something true to find, but they are WARNING-level by construction — a
    // CRITICAL anywhere now means real corruption, not demonstration content.
    const lotsByCode = new Map((await repositories.lots.list()).map((l) => [l.id, l.code]));
    const criticals = report.issues.filter((i) => i.severity === "CRITICAL");

    if (criticals.length > 0) {
      throw new Error(
        `CRITICAL integrity issues in the seeded dataset:\n${criticals
          .map((i) => `  ${i.code} on ${lotsByCode.get(i.entityId) ?? i.entityType} — ${i.description}`)
          .join("\n")}`
      );
    }
    expect(criticals).toHaveLength(0);
  }, 120_000);

  it("still detects the deliberate data-quality defects, as warnings", async () => {
    const admin = await sessionFor("SUPER_ADMIN");
    const report = await runIntegrityChecks(admin);

    // Guards the other direction: a dataset that reports a flawless 100% would mean the
    // quality engine had stopped looking, which is exactly what the demo must not claim.
    expect(report.warningCount).toBeGreaterThan(0);
  }, 120_000);
});
