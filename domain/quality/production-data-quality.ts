import { DATA_STATUS } from "../shared/enums";
import type {
  NewEnvironmentMeasurementRecord,
  NewFeedUsageRecord,
  NewMortalityRecord,
  NewWaterUsageRecord,
  NewWeightMeasurementRecord,
} from "../production/types";
import {
  checkLotBuildingRelationship,
  checkNonNegative,
  checkPositive,
  checkProvenance,
  checkRequired,
  checkValidDataStatus,
  checkValidDate,
  checkValidUnit,
  collectIssues,
} from "./checks";
import type { QualityCheckResult } from "./types";

export const FEED_UNITS = ["KG", "G", "T"] as const;
export const WATER_UNITS = ["L", "M3"] as const;
export const WEIGHT_UNITS = ["KG", "G"] as const;
export const ENVIRONMENT_UNIT_BY_TYPE: Record<string, readonly string[]> = {
  TEMPERATURE: ["C"],
  HUMIDITE: ["%"],
  CO2: ["PPM"],
  LUMIERE: ["LUX"],
};
export const ENVIRONMENT_MEASUREMENT_TYPES = Object.keys(ENVIRONMENT_UNIT_BY_TYPE);

export function checkFeedUsageQuality(record: NewFeedUsageRecord): QualityCheckResult {
  return collectIssues(
    checkRequired(record.feedType, "feedType", "Le type d'aliment"),
    checkPositive(record.quantity, "quantity", "La quantité d'aliment"),
    checkValidDate(record.occurredAt, "occurredAt", "La date d'alimentation", { notFuture: true }),
    checkValidUnit(record.unit, FEED_UNITS),
    checkValidDataStatus(record.dataStatus, DATA_STATUS),
    checkProvenance(record),
  );
}

export function checkWaterUsageQuality(record: NewWaterUsageRecord, lotBuildingId?: string): QualityCheckResult {
  return collectIssues(
    checkPositive(record.quantity, "quantity", "Le volume d'eau"),
    checkValidDate(record.occurredAt, "occurredAt", "La date de relevé", { notFuture: true }),
    checkValidUnit(record.unit, WATER_UNITS),
    checkValidDataStatus(record.dataStatus, DATA_STATUS),
    checkProvenance(record),
    lotBuildingId ? checkLotBuildingRelationship(lotBuildingId, record.buildingId) : null,
  );
}

export function checkWeightMeasurementQuality(record: NewWeightMeasurementRecord): QualityCheckResult {
  return collectIssues(
    checkPositive(record.averageWeight, "averageWeight", "Le poids moyen"),
    record.sampleCount !== null ? checkPositive(record.sampleCount, "sampleCount", "La taille d'échantillon") : null,
    checkValidDate(record.occurredAt, "occurredAt", "La date de pesée", { notFuture: true }),
    checkValidUnit(record.unit, WEIGHT_UNITS),
    checkValidDataStatus(record.dataStatus, DATA_STATUS),
    checkProvenance(record),
  );
}

export function checkMortalityRecordQuality(record: NewMortalityRecord): QualityCheckResult {
  return collectIssues(
    checkPositive(record.count, "count", "Le nombre de sujets"),
    !Number.isInteger(record.count)
      ? { severity: "error" as const, code: "INVALID_QUANTITY", message: "Le nombre de sujets doit être un entier.", field: "count" }
      : null,
    checkValidDate(record.occurredAt, "occurredAt", "La date de mortalité", { notFuture: true }),
    checkValidDataStatus(record.dataStatus, DATA_STATUS),
    checkProvenance(record),
  );
}

export function checkEnvironmentMeasurementQuality(
  record: NewEnvironmentMeasurementRecord,
  lotBuildingId?: string
): QualityCheckResult {
  const allowedUnits = ENVIRONMENT_UNIT_BY_TYPE[record.measurementType];
  return collectIssues(
    !ENVIRONMENT_MEASUREMENT_TYPES.includes(record.measurementType)
      ? {
          severity: "error" as const,
          code: "INVALID_MEASUREMENT_TYPE",
          message: `Type de mesure "${record.measurementType}" non reconnu.`,
          field: "measurementType",
        }
      : null,
    checkNonNegative(record.value, "value", "La valeur mesurée"),
    checkValidDate(record.occurredAt, "occurredAt", "L'horodatage de la mesure", { notFuture: true }),
    allowedUnits ? checkValidUnit(record.unit, allowedUnits) : null,
    checkValidDataStatus(record.dataStatus, DATA_STATUS),
    checkProvenance(record),
    lotBuildingId ? checkLotBuildingRelationship(lotBuildingId, record.buildingId) : null,
  );
}
