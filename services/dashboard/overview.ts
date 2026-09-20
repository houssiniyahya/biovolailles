import { repositories } from "../../data/repositories";
import { checkStaleReading } from "../../domain/quality/iot-data-quality";
import { canAccessModule } from "../../domain/shared/permissions";
import type { Session } from "../auth/session";
import { listBuildingsInScope, listFarmsInScope } from "../identity/queries";
import { resolveScopeLabel } from "../identity/scope-label";
import { listLotsWithContext } from "../production/lot-queries";
import { listDevicesInScope } from "../iot/queries";
import { listAlertsInScope } from "../intelligence/queries";
import { getPerformanceSnapshot } from "../intelligence/performance-service";
import { computeLotDataQuality } from "../quality/lot-quality";
import type { DashboardDevice, DashboardEvent, DashboardLot, DashboardOverview, DashboardSensorReading } from "./types";

const RECENT_EVENT_LIMIT = 40;

/**
 * Assembles the whole dashboard dataset for the caller's session in one pass, already
 * restricted to their scope by the same `listXInScope` functions every other screen uses
 * (services/identity/queries.ts, services/production/lot-queries.ts, services/iot/queries.ts)
 * — there is no separate "dashboard scope" concept, and no second IoT/quality data source
 * (phase-5 brief §1, §6). Everything downstream (KPIs, chart, needs-attention, activity)
 * is derived from this bundle by the pure functions in selectors.ts, once here for the
 * initial render and again client-side whenever the interactive filters change.
 */
export async function getDashboardOverview(session: Session): Promise<DashboardOverview> {
  const [farms, buildings, lotsWithContext, devicesRaw, alertsInScope] = await Promise.all([
    listFarmsInScope(session),
    listBuildingsInScope(session),
    listLotsWithContext(session),
    canAccessModule(session, "IOT") ? listDevicesInScope(session) : Promise.resolve([]),
    canAccessModule(session, "ALERTS") ? listAlertsInScope(session) : Promise.resolve([]),
  ]);

  const buildingById = new Map(buildings.map((b) => [b.id, b]));
  const farmById = new Map(farms.map((f) => [f.id, f]));

  const now = new Date();
  const [qualities, feedRecordsByLot, weightTrends] = await Promise.all([
    Promise.all(lotsWithContext.map((lot) => computeLotDataQuality(lot.id))),
    Promise.all(lotsWithContext.map((lot) => repositories.feedUsage.listByLot(lot.id))),
    // Only ACTIF lots have a meaningful growth trend — others get null without a wasted computation.
    Promise.all(
      lotsWithContext.map((lot) => (lot.status === "ACTIF" ? getPerformanceSnapshot(lot.id, "AVERAGE_WEIGHT", now).then((s) => s.trend) : null))
    ),
  ]);

  const lots: DashboardLot[] = lotsWithContext.map((lot, index) => ({
    id: lot.id,
    code: lot.code,
    species: lot.species,
    breed: lot.breed,
    status: lot.status,
    initialPopulation: lot.initialPopulation,
    currentPopulation: lot.currentPopulation,
    dataStatus: lot.dataStatus,
    farmId: lot.farmId,
    farmName: lot.farmName,
    buildingId: lot.buildingId,
    buildingCode: lot.buildingCode,
    quality: qualities[index],
    feedRecords: feedRecordsByLot[index].map((r) => ({ occurredAt: r.occurredAt, quantity: r.quantity })),
    weightTrend: weightTrends[index],
  }));

  const devices = await buildDashboardDevices(devicesRaw, buildingById, farmById);

  const lotIds = lotsWithContext.map((lot) => lot.id);
  const recentLotEvents = await repositories.lotEvents.listRecentByLots(lotIds, RECENT_EVENT_LIMIT);
  const actorIds = Array.from(new Set(recentLotEvents.map((e) => e.actorId).filter((id): id is string => Boolean(id))));
  const actors = await Promise.all(actorIds.map((id) => repositories.users.findById(id)));
  const actorNameById = new Map(actorIds.map((id, index) => [id, actors[index]?.fullName ?? "Utilisateur"]));
  const lotById = new Map(lotsWithContext.map((lot) => [lot.id, lot]));

  const events: DashboardEvent[] = recentLotEvents.map((event) => {
    const lot = lotById.get(event.lotId);
    return {
      id: event.id,
      eventType: event.eventType,
      payload: event.payload,
      occurredAt: event.occurredAt,
      actorName: event.actorId ? (actorNameById.get(event.actorId) ?? "Utilisateur") : "Système",
      lotId: event.lotId,
      lotCode: lot?.code ?? "—",
      farmId: lot?.farmId ?? "",
      farmName: lot?.farmName ?? "—",
      buildingId: lot?.buildingId ?? "",
      buildingCode: lot?.buildingCode ?? "—",
    };
  });

  const activeAlerts = alertsInScope.filter((entry) => entry.alert.status === "OPEN" || entry.alert.status === "ACKNOWLEDGED");

  return {
    role: session.role,
    scopeLabel: await resolveScopeLabel(session),
    generatedAt: now.toISOString(),
    farms: farms.map((f) => ({ id: f.id, name: f.name })),
    buildings: buildings.map((b) => ({ id: b.id, code: b.code, name: b.name, farmId: b.farmId })),
    lots,
    devices,
    events,
    activeAlerts,
  };
}

async function buildDashboardDevices(
  devicesRaw: Awaited<ReturnType<typeof listDevicesInScope>>,
  buildingById: Map<string, { id: string; code: string; name: string; farmId: string }>,
  farmById: Map<string, { id: string; name: string }>
): Promise<DashboardDevice[]> {
  if (devicesRaw.length === 0) return [];

  const buildingIdsWithDevices = Array.from(new Set(devicesRaw.map((d) => d.buildingId)));
  const [latestByBuildingArr, sensorsByDeviceArr] = await Promise.all([
    Promise.all(buildingIdsWithDevices.map((id) => repositories.measurements.latestByBuilding(id))),
    Promise.all(devicesRaw.map((d) => repositories.sensors.listByDevice(d.id))),
  ]);
  const latestByBuilding = new Map(buildingIdsWithDevices.map((id, index) => [id, latestByBuildingArr[index]]));
  const now = new Date();

  return devicesRaw.map((device, index) => {
    const building = buildingById.get(device.buildingId);
    const farm = building ? farmById.get(building.farmId) : undefined;
    const sensors = sensorsByDeviceArr[index];
    const sensorById = new Map(sensors.map((s) => [s.id, s]));
    const buildingLatest = latestByBuilding.get(device.buildingId) ?? [];
    const deviceLatest = buildingLatest.filter((m) => sensorById.has(m.sensorId));

    const latestReadings: DashboardSensorReading[] = deviceLatest.map((m) => ({
      sensorType: sensorById.get(m.sensorId)!.sensorType,
      value: m.value,
      unit: m.unit,
      capturedAt: m.capturedAt,
      dataStatus: m.dataStatus,
    }));

    const staleSensorCount =
      device.status === "ONLINE" ? deviceLatest.filter((m) => checkStaleReading(m.capturedAt, now) !== null).length : 0;

    return {
      id: device.id,
      code: device.code,
      status: device.status,
      lastCommunicationAt: device.lastCommunicationAt,
      batteryLevel: device.batteryLevel,
      farmId: farm?.id ?? "",
      farmName: farm?.name ?? "—",
      buildingId: device.buildingId,
      buildingCode: building?.code ?? "—",
      buildingName: building?.name ?? "—",
      latestReadings,
      staleSensorCount,
    };
  });
}

