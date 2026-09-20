import { describe, expect, it } from "vitest";
import type { LotDataQualitySummary } from "../quality/lot-quality";
import type { AlertWithContext } from "../intelligence/queries";
import {
  aggregateScopeQuality,
  buildNeedsAttentionItems,
  computeEnvironmentAverages,
  computeFeedTrend,
  computeKpis,
  filterAlerts,
  filterDevices,
  filterEvents,
  filterLots,
  mapAlertsToAttentionItems,
} from "./selectors";
import type { DashboardDevice, DashboardEvent, DashboardFilters, DashboardLot } from "./types";

function alertEntry(overrides: Partial<AlertWithContext> = {}): AlertWithContext {
  return {
    alert: { id: "alert-1", anomalyId: "anomaly-1", status: "OPEN", assignedTo: null, raisedAt: "2026-08-16T00:00:00.000Z", resolvedAt: null },
    anomaly: {
      id: "anomaly-1",
      ruleId: "rule-1",
      measurementId: null,
      kpiValueId: null,
      lotId: "lot-1",
      buildingId: null,
      severity: "WARNING",
      observedValue: 10,
      referenceValue: 5,
      deviationPercent: 100,
      unit: "%",
      confidence: "MEDIUM",
      explanation: {
        what: "Test",
        where: "Test",
        when: "2026-08-16T00:00:00.000Z",
        whatChanged: "Consommation en hausse",
        comparedTo: "Test",
        byHowMuch: "Test",
        basedOnData: "Test",
        whyTriggered: "Test",
      },
      detectedAt: "2026-08-16T00:00:00.000Z",
      status: "OPEN",
    },
    rule: { id: "rule-1", name: "Règle test", target: "population", condition: { operator: "GT", threshold: 0 }, severity: "WARNING", active: true, description: "", explanationTemplate: "" },
    lotId: "lot-1",
    lotCode: "BU-2026-001",
    buildingId: "building-1",
    buildingCode: "BAT-01",
    farmId: "farm-1",
    farmName: "Ferme Test",
    ...overrides,
  };
}

function quality(overrides: Partial<LotDataQualitySummary> = {}): LotDataQualitySummary {
  return {
    totalRecords: 0,
    byDataStatus: { REEL: 0, TEST: 0, SIMULATION: 0, CALCULE: 0, ESTIME: 0, A_CONFIRMER: 0, VALIDE: 0, MANQUANT: 0 },
    errorCount: 0,
    warningCount: 0,
    scorePercent: 100,
    issues: [],
    populationReconciliation: {
      initialPopulation: 1000,
      totalMortality: 0,
      totalExits: 0,
      totalEntries: 0,
      expectedPopulation: 1000,
      recordedPopulation: 1000,
      consistent: true,
      difference: 0,
    },
    ...overrides,
  };
}

function lot(overrides: Partial<DashboardLot> = {}): DashboardLot {
  return {
    id: "lot-1",
    code: "BU-2026-001",
    species: "Poulet de chair",
    breed: "Ross 308",
    status: "ACTIF",
    initialPopulation: 1000,
    currentPopulation: 950,
    dataStatus: "SIMULATION",
    farmId: "farm-1",
    farmName: "Ferme Test",
    buildingId: "building-1",
    buildingCode: "BAT-01",
    quality: quality(),
    feedRecords: [],
    weightTrend: null,
    ...overrides,
  };
}

function device(overrides: Partial<DashboardDevice> = {}): DashboardDevice {
  return {
    id: "device-1",
    code: "DEV-01",
    status: "ONLINE",
    lastCommunicationAt: "2026-08-16T10:00:00.000Z",
    batteryLevel: 80,
    farmId: "farm-1",
    farmName: "Ferme Test",
    buildingId: "building-1",
    buildingCode: "BAT-01",
    buildingName: "Bâtiment 1",
    latestReadings: [],
    staleSensorCount: 0,
    ...overrides,
  };
}

function baseFilters(overrides: Partial<DashboardFilters> = {}): DashboardFilters {
  return { farmId: "ALL", buildingId: "ALL", periodDays: 7, ...overrides };
}

const NOW = new Date("2026-08-16T12:00:00.000Z");

describe("filterLots / filterDevices", () => {
  it("filters by farm and building membership", () => {
    const lots = [lot({ id: "a", farmId: "farm-1", buildingId: "b1" }), lot({ id: "b", farmId: "farm-2", buildingId: "b2" })];
    expect(filterLots(lots, baseFilters({ farmId: "farm-1" })).map((l) => l.id)).toEqual(["a"]);
    expect(filterLots(lots, baseFilters({ buildingId: "b2" })).map((l) => l.id)).toEqual(["b"]);
    expect(filterLots(lots, baseFilters()).map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("filters devices the same way", () => {
    const devices = [device({ id: "d1", farmId: "farm-1" }), device({ id: "d2", farmId: "farm-2" })];
    expect(filterDevices(devices, baseFilters({ farmId: "farm-2" })).map((d) => d.id)).toEqual(["d2"]);
  });
});

describe("filterEvents", () => {
  function event(overrides: Partial<DashboardEvent> = {}): DashboardEvent {
    return {
      id: "e1",
      eventType: "MORTALITE",
      payload: {},
      occurredAt: "2026-08-15T00:00:00.000Z",
      actorName: "Système",
      lotId: "lot-1",
      lotCode: "BU-2026-001",
      farmId: "farm-1",
      farmName: "Ferme Test",
      buildingId: "building-1",
      buildingCode: "BAT-01",
      ...overrides,
    };
  }

  it("excludes events outside the period window", () => {
    const events = [event({ id: "recent", occurredAt: "2026-08-15T00:00:00.000Z" }), event({ id: "old", occurredAt: "2026-07-01T00:00:00.000Z" })];
    const result = filterEvents(events, baseFilters({ periodDays: 7 }), NOW);
    expect(result.map((e) => e.id)).toEqual(["recent"]);
  });

  it("also applies the farm/building filter", () => {
    const events = [event({ id: "here", farmId: "farm-1" }), event({ id: "elsewhere", farmId: "farm-2" })];
    const result = filterEvents(events, baseFilters({ farmId: "farm-1", periodDays: 30 }), NOW);
    expect(result.map((e) => e.id)).toEqual(["here"]);
  });
});

describe("computeKpis", () => {
  it("counts active lots and sums population only for occupied statuses", () => {
    const lots = [
      lot({ id: "a", status: "ACTIF", currentPopulation: 900 }),
      lot({ id: "b", status: "SUSPENDU", currentPopulation: 500 }),
      lot({ id: "c", status: "PLANIFIE", currentPopulation: 0 }),
      lot({ id: "d", status: "CLOTURE", currentPopulation: 700 }),
    ];
    const kpis = computeKpis(lots, [], [], baseFilters(), NOW);
    expect(kpis.activeLots).toBe(1);
    expect(kpis.totalLots).toBe(4);
    expect(kpis.population).toBe(1400); // ACTIF + SUSPENDU only
  });

  it("sums feed quantity only within the selected period", () => {
    const lots = [
      lot({
        feedRecords: [
          { occurredAt: "2026-08-15T00:00:00.000Z", quantity: 100 }, // within 7d
          { occurredAt: "2026-07-01T00:00:00.000Z", quantity: 500 }, // outside
        ],
      }),
    ];
    const kpis = computeKpis(lots, [], [], baseFilters({ periodDays: 7 }), NOW);
    expect(kpis.feedQuantityKg).toBe(100);
  });

  it("tallies device health counts", () => {
    const devices = [device({ status: "ONLINE" }), device({ status: "OFFLINE" }), device({ status: "FAULT" })];
    const kpis = computeKpis([], devices, [], baseFilters(), NOW);
    expect(kpis.devicesTotal).toBe(3);
    expect(kpis.devicesOnline).toBe(1);
    expect(kpis.devicesOffline).toBe(1);
    expect(kpis.devicesFault).toBe(1);
  });
});

describe("computeFeedTrend", () => {
  it("zero-fills every day in the window and buckets records by day", () => {
    const lots = [
      lot({
        feedRecords: [
          { occurredAt: "2026-08-16T08:00:00.000Z", quantity: 40 },
          { occurredAt: "2026-08-16T10:00:00.000Z", quantity: 10 },
          { occurredAt: "2026-08-14T08:00:00.000Z", quantity: 25 },
        ],
      }),
    ];
    const trend = computeFeedTrend(lots, baseFilters({ periodDays: 7 }), NOW);
    expect(trend).toHaveLength(7);
    expect(trend.at(-1)!.date).toBe("2026-08-16");
    expect(trend.at(-1)!.value).toBe(50);
    expect(trend.find((p) => p.date === "2026-08-14")!.value).toBe(25);
    expect(trend.find((p) => p.date === "2026-08-10")!.value).toBe(0);
  });
});

describe("aggregateScopeQuality", () => {
  it("sums records/errors/warnings and computes a weighted score", () => {
    const lots = [
      lot({ quality: quality({ totalRecords: 10, errorCount: 1, warningCount: 0, scorePercent: 90 }) }),
      lot({ quality: quality({ totalRecords: 0, errorCount: 0, warningCount: 1, scorePercent: 50 }) }),
    ];
    const summary = aggregateScopeQuality(lots);
    expect(summary.totalRecords).toBe(10);
    expect(summary.errorCount).toBe(1);
    expect(summary.warningCount).toBe(1);
    expect(summary.lotsWithIssues).toBe(2);
    // weighted by (totalRecords+1): (90*11 + 50*1) / 12 = 86.67 -> rounds to 87
    expect(summary.scorePercent).toBe(87);
  });

  it("defaults to 100 for an empty lot list", () => {
    expect(aggregateScopeQuality([]).scorePercent).toBe(100);
  });
});

describe("buildNeedsAttentionItems", () => {
  it("surfaces a lot's quality issues, labeling population inconsistencies distinctly", () => {
    const withIssue = lot({
      quality: quality({
        issues: [
          { recordType: "population", recordId: "lot-1", issue: { severity: "error", code: "POPULATION_INCONSISTENCY", message: "Écart détecté." } },
          { recordType: "weight", recordId: "w1", issue: { severity: "warning", code: "MISSING_PROVENANCE", message: "Source manquante." } },
        ],
      }),
    });
    const items = buildNeedsAttentionItems([withIssue], [], NOW);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Incohérence d'effectif");
    expect(items[0].severity).toBe("critical");
    expect(items[1].title).toBe("Donnée à vérifier");
    expect(items[1].severity).toBe("warning");
  });

  it("flags SUSPENDU/BLOQUE lots and sorts critical items first", () => {
    const suspended = lot({ id: "s", status: "SUSPENDU" });
    const blocked = lot({ id: "b", status: "BLOQUE" });
    const items = buildNeedsAttentionItems([suspended, blocked], [], NOW);
    expect(items[0].severity).toBe("critical");
    expect(items[0].id).toContain("b");
    expect(items[1].severity).toBe("warning");
  });

  it("flags offline and fault devices with a relative-time reason", () => {
    const offline = device({ id: "off", status: "OFFLINE", lastCommunicationAt: "2026-08-16T09:00:00.000Z" });
    const fault = device({ id: "fault", status: "FAULT", lastCommunicationAt: null });
    const items = buildNeedsAttentionItems([], [offline, fault], NOW);
    const offlineItem = items.find((i) => i.id === "device-status-off")!;
    const faultItem = items.find((i) => i.id === "device-status-fault")!;
    expect(offlineItem.severity).toBe("warning");
    expect(offlineItem.reason).toContain("il y a 3 h");
    expect(faultItem.severity).toBe("critical");
    expect(faultItem.reason).toBe("Aucune communication enregistrée.");
  });

  it("flags an ONLINE device with stale sensors, but not an ONLINE device without them", () => {
    const stale = device({ id: "stale", status: "ONLINE", staleSensorCount: 2 });
    const fresh = device({ id: "fresh", status: "ONLINE", staleSensorCount: 0 });
    const items = buildNeedsAttentionItems([], [stale, fresh], NOW);
    expect(items.map((i) => i.id)).toEqual(["device-stale-stale"]);
    expect(items[0].reason).toContain("2 capteur(s)");
  });

  it("returns nothing for a clean scope", () => {
    expect(buildNeedsAttentionItems([lot()], [device()], NOW)).toHaveLength(0);
  });
});

describe("computeEnvironmentAverages", () => {
  it("averages each environmental sensor type across devices and ignores non-environmental types", () => {
    const devices = [
      device({
        id: "d1",
        latestReadings: [
          { sensorType: "TEMPERATURE", value: 26, unit: "C", capturedAt: "2026-08-16T10:00:00.000Z", dataStatus: "SIMULATION" },
          { sensorType: "POIDS", value: 1.8, unit: "KG", capturedAt: "2026-08-16T10:00:00.000Z", dataStatus: "SIMULATION" },
        ],
      }),
      device({
        id: "d2",
        latestReadings: [{ sensorType: "TEMPERATURE", value: 28, unit: "C", capturedAt: "2026-08-16T11:00:00.000Z", dataStatus: "SIMULATION" }],
      }),
    ];
    const averages = computeEnvironmentAverages(devices);
    expect(averages).toHaveLength(1);
    expect(averages[0].sensorType).toBe("TEMPERATURE");
    expect(averages[0].value).toBe(27);
    expect(averages[0].capturedAt).toBe("2026-08-16T11:00:00.000Z");
    expect(averages[0].sensorCount).toBe(2);
  });

  it("returns an empty array when no device has environmental readings", () => {
    expect(computeEnvironmentAverages([device({ latestReadings: [] })])).toEqual([]);
  });
});

describe("filterAlerts", () => {
  it("filters by farm/building the same way as lots and devices", () => {
    const alerts = [alertEntry({ farmId: "farm-1" }), alertEntry({ farmId: "farm-2" })];
    expect(filterAlerts(alerts, baseFilters({ farmId: "farm-1" })).length).toBe(1);
  });

  it("is not period-filtered — an active alert stays relevant regardless of its age", () => {
    const old = alertEntry({ anomaly: { ...alertEntry().anomaly, detectedAt: "2020-01-01T00:00:00.000Z" } });
    expect(filterAlerts([old], baseFilters({ periodDays: 7 }))).toHaveLength(1);
  });
});

describe("mapAlertsToAttentionItems", () => {
  it("maps a CRITICAL anomaly to critical severity and links to the alert detail page", () => {
    const critical = alertEntry({ anomaly: { ...alertEntry().anomaly, severity: "CRITICAL" } });
    const items = mapAlertsToAttentionItems([critical]);
    expect(items[0].severity).toBe("critical");
    expect(items[0].href).toBe("/alertes/alert-1");
    expect(items[0].context).toContain("BU-2026-001");
  });

  it("sorts critical items before warnings", () => {
    const warning = alertEntry({ alert: { ...alertEntry().alert, id: "a-warn" }, anomaly: { ...alertEntry().anomaly, id: "an-warn", severity: "WARNING" } });
    const critical = alertEntry({ alert: { ...alertEntry().alert, id: "a-crit" }, anomaly: { ...alertEntry().anomaly, id: "an-crit", severity: "CRITICAL" } });
    const items = mapAlertsToAttentionItems([warning, critical]);
    expect(items[0].severity).toBe("critical");
  });
});

describe("computeKpis — activeAlerts", () => {
  it("counts the (already-filtered) active alerts passed in", () => {
    const kpis = computeKpis([], [], [alertEntry(), alertEntry({ alert: { ...alertEntry().alert, id: "alert-2" } })], baseFilters(), NOW);
    expect(kpis.activeAlerts).toBe(2);
  });
});
