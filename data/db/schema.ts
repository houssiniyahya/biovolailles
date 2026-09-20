import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import {
  ALERT_SEVERITY,
  ALERT_STATUS,
  ANOMALY_STATUS,
  BUILDING_ZONE_TYPE,
  DATA_STATUS,
  DESTINATION_TYPE,
  DEVICE_STATUS,
  EVENT_TYPE,
  LOT_STATUS,
  MEASUREMENT_SOURCE_TYPE,
  ORGANIZATION_TYPE,
  RELATION_TYPE,
  ROLE,
  SANITARY_STATUS,
  SCOPE_TYPE,
  SENSOR_TYPE,
  VALIDATION_STATUS,
} from "../../domain/shared/enums";

/**
 * Drizzle schema — mirrors domain/*\/types.ts 1:1 (same fields, camelCase JS <-> snake_case columns).
 * This file is the ONLY place table shape is defined; repositories map rows to domain types.
 * SQLite/libSQL today; the shape is chosen to be a near-direct port to Postgres later
 * (see ARCHITECTURE.md §5) — swap the driver + `sqliteTable` -> `pgTable`, keep the columns.
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString());

/**
 * Shared provenance shape (domain/shared/provenance.ts) — source_type/source_id, actor_id,
 * data_status, measurement_method, device_id, document_id, validation_status. Every
 * structured record since Phase 3 (feed/water/weight/mortality/environment, measurements)
 * and, as of Phase 7, every downstream traceability stage (collections, slaughter_batches,
 * transformation_batches, products) spreads this instead of declaring its own data_status.
 * Defined here (before `users` is declared below) because it's only *called* later, once
 * `users` already exists — the `.references(() => users.id)` closure isn't evaluated until
 * Drizzle resolves the reference, not at this function's own definition time.
 */
const provenanceColumns = () => ({
  sourceType: text("source_type", { enum: MEASUREMENT_SOURCE_TYPE }).notNull(),
  sourceId: text("source_id"),
  actorId: text("actor_id").references(() => users.id),
  dataStatus: text("data_status", { enum: DATA_STATUS }).notNull(),
  measurementMethod: text("measurement_method"),
  deviceId: text("device_id"),
  documentId: text("document_id"),
  validationStatus: text("validation_status", { enum: VALIDATION_STATUS }),
});

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const organizations = sqliteTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  type: text("type", { enum: ORGANIZATION_TYPE }).notNull(),
  createdAt: createdAt(),
});

export const cooperatives = sqliteTable("cooperatives", {
  id: id(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  region: text("region").notNull(),
  createdAt: createdAt(),
});

export const producers = sqliteTable("producers", {
  id: id(),
  cooperativeId: text("cooperative_id")
    .notNull()
    .references(() => cooperatives.id),
  name: text("name").notNull(),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  createdAt: createdAt(),
});

export const farms = sqliteTable("farms", {
  id: id(),
  producerId: text("producer_id")
    .notNull()
    .references(() => producers.id),
  name: text("name").notNull(),
  city: text("city").notNull(),
  region: text("region").notNull(),
  geoLat: real("geo_lat"),
  geoLng: real("geo_lng"),
  createdAt: createdAt(),
});

export const buildings = sqliteTable("buildings", {
  id: id(),
  farmId: text("farm_id")
    .notNull()
    .references(() => farms.id),
  code: text("code").notNull(),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
  zoneType: text("zone_type", { enum: BUILDING_ZONE_TYPE }).notNull(),
  createdAt: createdAt(),
});

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role", { enum: ROLE }).notNull(),
  scopeType: text("scope_type", { enum: SCOPE_TYPE }).notNull(),
  scopeId: text("scope_id"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  lastLoginAt: text("last_login_at"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

export const lots = sqliteTable("lots", {
  id: id(),
  buildingId: text("building_id")
    .notNull()
    .references(() => buildings.id),
  code: text("code").notNull(),
  species: text("species").notNull(),
  breed: text("breed").notNull(),
  status: text("status", { enum: LOT_STATUS }).notNull(),
  initialPopulation: integer("initial_population").notNull(),
  currentPopulation: integer("current_population").notNull(),
  plannedStartAt: text("planned_start_at"),
  startedAt: text("started_at"),
  endedAt: text("ended_at"),
  dataStatus: text("data_status", { enum: DATA_STATUS }).notNull(),
  createdAt: createdAt(),
});

export const lotEvents = sqliteTable("lot_events", {
  id: id(),
  lotId: text("lot_id")
    .notNull()
    .references(() => lots.id),
  eventType: text("event_type", { enum: EVENT_TYPE }).notNull(),
  payload: text("payload", { mode: "json" }).notNull(),
  occurredAt: text("occurred_at").notNull(),
  actorId: text("actor_id").references(() => users.id),
  dataStatus: text("data_status", { enum: DATA_STATUS }).notNull(),
  sourceType: text("source_type", { enum: MEASUREMENT_SOURCE_TYPE }),
  sourceId: text("source_id"),
  deviceId: text("device_id"),
  measurementMethod: text("measurement_method"),
  validationStatus: text("validation_status", { enum: VALIDATION_STATUS }),
  createdAt: createdAt(),
});

export const collections = sqliteTable("collections", {
  id: id(),
  code: text("code").notNull().unique(),
  lotId: text("lot_id")
    .notNull()
    .references(() => lots.id),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  destinationId: text("destination_id").references(() => destinations.id),
  collectedAt: text("collected_at").notNull(),
  ...provenanceColumns(),
  createdAt: createdAt(),
});

export const slaughterBatches = sqliteTable("slaughter_batches", {
  id: id(),
  code: text("code").notNull().unique(),
  sourceLotId: text("source_lot_id")
    .notNull()
    .references(() => lots.id),
  quantityIn: real("quantity_in").notNull(),
  quantityOut: real("quantity_out").notNull(),
  losses: real("losses").notNull(),
  slaughteredAt: text("slaughtered_at").notNull(),
  ...provenanceColumns(),
  createdAt: createdAt(),
});

export const transformationBatches = sqliteTable("transformation_batches", {
  id: id(),
  code: text("code").notNull().unique(),
  upstreamType: text("upstream_type", { enum: ["SLAUGHTER_BATCH", "TRANSFORMATION_BATCH"] as const }).notNull(),
  upstreamId: text("upstream_id").notNull(),
  processType: text("process_type").notNull(),
  inputQuantity: real("input_quantity").notNull(),
  outputQuantity: real("output_quantity").notNull(),
  losses: real("losses").notNull(),
  rejects: real("rejects").notNull().default(0),
  occurredAt: text("occurred_at").notNull(),
  ...provenanceColumns(),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Structured analytical data (Phase 3) — dedicated columns, not generic JSON.
// provenanceColumns() is defined near the top of this file — see the comment there.
// ---------------------------------------------------------------------------

export const feedUsageRecords = sqliteTable("feed_usage_records", {
  id: id(),
  lotId: text("lot_id")
    .notNull()
    .references(() => lots.id),
  occurredAt: text("occurred_at").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  feedType: text("feed_type").notNull(),
  feedSource: text("feed_source"),
  ...provenanceColumns(),
  createdAt: createdAt(),
});

export const waterUsageRecords = sqliteTable("water_usage_records", {
  id: id(),
  buildingId: text("building_id")
    .notNull()
    .references(() => buildings.id),
  lotId: text("lot_id").references(() => lots.id),
  occurredAt: text("occurred_at").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  source: text("source"),
  ...provenanceColumns(),
  createdAt: createdAt(),
});

export const weightMeasurementRecords = sqliteTable("weight_measurement_records", {
  id: id(),
  lotId: text("lot_id")
    .notNull()
    .references(() => lots.id),
  occurredAt: text("occurred_at").notNull(),
  averageWeight: real("average_weight").notNull(),
  unit: text("unit").notNull(),
  sampleCount: integer("sample_count"),
  ...provenanceColumns(),
  createdAt: createdAt(),
});

export const mortalityRecords = sqliteTable("mortality_records", {
  id: id(),
  lotId: text("lot_id")
    .notNull()
    .references(() => lots.id),
  occurredAt: text("occurred_at").notNull(),
  count: integer("count").notNull(),
  suspectedCause: text("suspected_cause"),
  causeValidated: integer("cause_validated", { mode: "boolean" }).notNull().default(false),
  ...provenanceColumns(),
  createdAt: createdAt(),
});

export const environmentMeasurementRecords = sqliteTable("environment_measurement_records", {
  id: id(),
  buildingId: text("building_id")
    .notNull()
    .references(() => buildings.id),
  lotId: text("lot_id").references(() => lots.id),
  measurementType: text("measurement_type", { enum: SENSOR_TYPE }).notNull(),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  occurredAt: text("occurred_at").notNull(),
  ...provenanceColumns(),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// IoT
// ---------------------------------------------------------------------------

export const devices = sqliteTable("devices", {
  id: id(),
  buildingId: text("building_id")
    .notNull()
    .references(() => buildings.id),
  code: text("code").notNull().unique(),
  type: text("type", { enum: ["CAPTEUR_MULTI", "PASSERELLE"] as const }).notNull(),
  status: text("status", { enum: DEVICE_STATUS }).notNull(),
  installedAt: text("installed_at").notNull(),
  lastCommunicationAt: text("last_communication_at"),
  batteryLevel: integer("battery_level"),
  signalQuality: integer("signal_quality"),
});

export const sensors = sqliteTable("sensors", {
  id: id(),
  deviceId: text("device_id")
    .notNull()
    .references(() => devices.id),
  sensorType: text("sensor_type", { enum: SENSOR_TYPE }).notNull(),
  unit: text("unit").notNull(),
  status: text("status", { enum: DEVICE_STATUS }).notNull(),
  configuration: text("configuration", { mode: "json" }),
});

export const measurements = sqliteTable("measurements", {
  id: id(),
  sensorId: text("sensor_id")
    .notNull()
    .references(() => sensors.id),
  buildingId: text("building_id")
    .notNull()
    .references(() => buildings.id),
  lotId: text("lot_id").references(() => lots.id),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  capturedAt: text("captured_at").notNull(),
  ...provenanceColumns(),
  // Overrides provenanceColumns()'s loose, nullable `deviceId` — a measurement's device is
  // a real, required FK (every reading comes from an actual device), not a loose pointer.
  deviceId: text("device_id")
    .notNull()
    .references(() => devices.id),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Intelligence
// ---------------------------------------------------------------------------

export const kpiDefinitions = sqliteTable("kpi_definitions", {
  id: id(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  unit: text("unit").notNull(),
  formulaDesc: text("formula_desc").notNull(),
});

export const kpiValues = sqliteTable("kpi_values", {
  id: id(),
  kpiDefinitionId: text("kpi_definition_id")
    .notNull()
    .references(() => kpiDefinitions.id),
  lotId: text("lot_id").references(() => lots.id),
  buildingId: text("building_id").references(() => buildings.id),
  period: text("period").notNull(),
  value: real("value").notNull(),
  dataStatus: text("data_status", { enum: DATA_STATUS }).notNull(),
  calculatedAt: text("calculated_at").notNull(),
});

export const rules = sqliteTable("rules", {
  id: id(),
  name: text("name").notNull(),
  target: text("target").notNull(),
  condition: text("condition", { mode: "json" }).notNull(),
  severity: text("severity", { enum: ALERT_SEVERITY }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  description: text("description").notNull(),
  explanationTemplate: text("explanation_template").notNull(),
});

export const anomalies = sqliteTable("anomalies", {
  id: id(),
  ruleId: text("rule_id")
    .notNull()
    .references(() => rules.id),
  measurementId: text("measurement_id").references(() => measurements.id),
  kpiValueId: text("kpi_value_id").references(() => kpiValues.id),
  lotId: text("lot_id").references(() => lots.id),
  buildingId: text("building_id").references(() => buildings.id),
  severity: text("severity", { enum: ALERT_SEVERITY }).notNull(),
  observedValue: real("observed_value"),
  referenceValue: real("reference_value"),
  deviationPercent: real("deviation_percent"),
  unit: text("unit"),
  confidence: text("confidence", { enum: ["HIGH", "MEDIUM", "LOW"] as const }).notNull(),
  /** JSON-encoded AnomalyExplanation (domain/intelligence/types.ts) — the eight-question breakdown, not a flat sentence. */
  explanation: text("explanation", { mode: "json" }).notNull(),
  detectedAt: text("detected_at").notNull(),
  status: text("status", { enum: ANOMALY_STATUS }).notNull(),
});

export const alerts = sqliteTable("alerts", {
  id: id(),
  anomalyId: text("anomaly_id")
    .notNull()
    .references(() => anomalies.id),
  status: text("status", { enum: ALERT_STATUS }).notNull(),
  assignedTo: text("assigned_to").references(() => users.id),
  raisedAt: text("raised_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export const actionRecords = sqliteTable("actions", {
  id: id(),
  alertId: text("alert_id").references(() => alerts.id),
  lotId: text("lot_id").references(() => lots.id),
  actionType: text("action_type").notNull(),
  description: text("description").notNull(),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id),
  performedAt: text("performed_at").notNull(),
});

// ---------------------------------------------------------------------------
// Sanitary
// ---------------------------------------------------------------------------

export const sanitaryObservations = sqliteTable("sanitary_observations", {
  id: id(),
  lotId: text("lot_id")
    .notNull()
    .references(() => lots.id),
  status: text("status", { enum: SANITARY_STATUS }).notNull(),
  notes: text("notes").notNull(),
  observedBy: text("observed_by")
    .notNull()
    .references(() => users.id),
  observedAt: text("observed_at").notNull(),
  validatedBy: text("validated_by").references(() => users.id),
  validationStatus: text("validation_status", { enum: VALIDATION_STATUS }).notNull(),
});

// ---------------------------------------------------------------------------
// Traceability / QR
// ---------------------------------------------------------------------------

export const destinations = sqliteTable("destinations", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type", { enum: DESTINATION_TYPE }).notNull(),
  city: text("city").notNull(),
});

export const products = sqliteTable("products", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  transformationBatchId: text("transformation_batch_id")
    .notNull()
    .references(() => transformationBatches.id),
  packagingDate: text("packaging_date").notNull(),
  expiryDate: text("expiry_date"),
  ...provenanceColumns(),
  createdAt: createdAt(),
});

export const relations = sqliteTable("relations", {
  id: id(),
  fromType: text("from_type").notNull(),
  fromId: text("from_id").notNull(),
  relationType: text("relation_type", { enum: RELATION_TYPE }).notNull(),
  toType: text("to_type").notNull(),
  toId: text("to_id").notNull(),
  metadata: text("metadata", { mode: "json" }).notNull(),
  createdAt: createdAt(),
});

export const qrTokens = sqliteTable("qr_tokens", {
  id: id(),
  token: text("token").notNull().unique(),
  scope: text("scope", { enum: ["LOT", "PRODUCT"] as const }).notNull(),
  lotId: text("lot_id").references(() => lots.id),
  productId: text("product_id").references(() => products.id),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
  expiresAt: text("expires_at"),
});

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export const auditLog = sqliteTable("audit_log", {
  id: id(),
  actorId: text("actor_id").references(() => users.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  field: text("field"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  reason: text("reason"),
  relatedLotId: text("related_lot_id").references(() => lots.id),
  relatedEventId: text("related_event_id").references(() => lotEvents.id),
  createdAt: createdAt(),
});
