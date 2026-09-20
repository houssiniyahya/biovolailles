import type { DataStatus, DeviceStatus, EventType, LotStatus, Role, SensorType } from "../../domain/shared/enums";
import type { TrendResult } from "../../domain/intelligence/trend";
import type { LotDataQualitySummary } from "../quality/lot-quality";
import type { AlertWithContext } from "../intelligence/queries";

/**
 * The dashboard's whole data model, in one place. `overview.ts` (server, does I/O) builds
 * this once per request, scoped to the caller's session; `selectors.ts` (pure, no I/O) then
 * filters/aggregates it — both server (initial render) and client (interactive filters) call
 * the same selector functions over the same shape, so there is exactly one place the numbers
 * are computed (phase-5 brief §16 "avoid obvious N+1", §10 "filters must actually change
 * the underlying data").
 */

export interface DashboardLot {
  id: string;
  code: string;
  species: string;
  breed: string;
  status: LotStatus;
  initialPopulation: number;
  currentPopulation: number;
  dataStatus: DataStatus;
  farmId: string;
  farmName: string;
  buildingId: string;
  buildingCode: string;
  /** Reused as-is from services/quality/lot-quality.ts — no second quality engine (phase-5 brief §8). */
  quality: LotDataQualitySummary;
  feedRecords: { occurredAt: string; quantity: number }[];
  /** AVERAGE_WEIGHT trend (phase-6 brief §19) — only computed for ACTIF lots; null otherwise, never manufactured. */
  weightTrend: TrendResult | null;
}

export interface DashboardSensorReading {
  sensorType: SensorType;
  value: number;
  unit: string;
  capturedAt: string;
  dataStatus: DataStatus;
}

export interface DashboardDevice {
  id: string;
  code: string;
  status: DeviceStatus;
  lastCommunicationAt: string | null;
  batteryLevel: number | null;
  farmId: string;
  farmName: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  latestReadings: DashboardSensorReading[];
  /** Sensors on an ONLINE device whose latest reading is older than the freshness threshold. */
  staleSensorCount: number;
}

export interface DashboardEvent {
  id: string;
  eventType: EventType;
  payload: Record<string, unknown>;
  occurredAt: string;
  actorName: string;
  lotId: string;
  lotCode: string;
  farmId: string;
  farmName: string;
  buildingId: string;
  buildingCode: string;
}

export type AttentionSeverity = "critical" | "warning";

export interface NeedsAttentionItem {
  id: string;
  severity: AttentionSeverity;
  title: string;
  context: string;
  reason: string;
  time: string | null;
  href: string;
  farmId: string;
  buildingId: string;
}

export interface ScopeQualitySummary {
  totalRecords: number;
  byDataStatus: Record<DataStatus, number>;
  errorCount: number;
  warningCount: number;
  scorePercent: number;
  lotsWithIssues: number;
}

export interface DashboardKpis {
  activeLots: number;
  totalLots: number;
  population: number;
  feedQuantityKg: number;
  devicesTotal: number;
  devicesOnline: number;
  devicesOffline: number;
  devicesFault: number;
  activeAlerts: number;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export type PeriodDays = 7 | 14 | 30;

export interface DashboardFilters {
  farmId: string | "ALL";
  buildingId: string | "ALL";
  periodDays: PeriodDays;
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = { farmId: "ALL", buildingId: "ALL", periodDays: 7 };

export interface DashboardOverview {
  role: Role;
  scopeLabel: string;
  generatedAt: string;
  farms: { id: string; name: string }[];
  buildings: { id: string; code: string; name: string; farmId: string }[];
  lots: DashboardLot[];
  devices: DashboardDevice[];
  events: DashboardEvent[];
  /** Only OPEN/ACKNOWLEDGED alerts — resolved/dismissed history lives on /alertes, not on the live-glance dashboard. */
  activeAlerts: AlertWithContext[];
}
