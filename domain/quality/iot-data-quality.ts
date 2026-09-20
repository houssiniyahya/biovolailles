import { DATA_STATUS, type DeviceStatus } from "../shared/enums";
import type { NewMeasurement } from "../iot/types";
import {
  checkLotBuildingRelationship,
  checkProvenance,
  checkValidDataStatus,
  checkValidDate,
  collectIssues,
} from "./checks";
import type { QualityCheckResult, QualityIssue } from "./types";

export const SENSOR_UNIT_BY_TYPE: Record<string, readonly string[]> = {
  TEMPERATURE: ["C"],
  HUMIDITE: ["%"],
  CO2: ["PPM"],
  LUMIERE: ["LUX"],
  EAU: ["L"],
  ALIMENT: ["KG"],
  POIDS: ["KG", "G"],
};

const DEFAULT_STALE_THRESHOLD_MINUTES = 60;

/**
 * A record's own value/date/status/provenance validity — same shape as the other Phase-3
 * checks. Unit correctness is a separate check (checkMeasurementUnitMatchesSensor) since
 * it's validated against the sensor's own configured unit, not a fixed list.
 */
export function checkMeasurementQuality(record: NewMeasurement, lotBuildingId?: string): QualityCheckResult {
  return collectIssues(
    !Number.isFinite(record.value)
      ? { severity: "error", code: "INVALID_VALUE", message: "La valeur mesurée n'est pas un nombre valide.", field: "value" }
      : null,
    checkValidDate(record.capturedAt, "capturedAt", "L'horodatage de la mesure", { notFuture: true }),
    checkValidDataStatus(record.dataStatus, DATA_STATUS),
    checkProvenance(record),
    lotBuildingId ? checkLotBuildingRelationship(lotBuildingId, record.buildingId) : null
  );
}

/** The unit a measurement declares must match the unit its own sensor is configured for. */
export function checkMeasurementUnitMatchesSensor(measurementUnit: string, sensorUnit: string): QualityIssue | null {
  if (measurementUnit !== sensorUnit) {
    return {
      severity: "error",
      code: "INVALID_UNIT",
      message: `L'unité de la mesure ("${measurementUnit}") ne correspond pas à celle du capteur ("${sensorUnit}").`,
      field: "unit",
    };
  }
  return null;
}

export function checkStaleReading(
  capturedAt: string,
  now: Date = new Date(),
  maxAgeMinutes: number = DEFAULT_STALE_THRESHOLD_MINUTES
): QualityIssue | null {
  const ageMinutes = (now.getTime() - new Date(capturedAt).getTime()) / 60_000;
  if (ageMinutes > maxAgeMinutes) {
    return {
      severity: "warning",
      code: "STALE_READING",
      message: `Dernière lecture il y a ${Math.round(ageMinutes)} minute(s) — au-delà du seuil de fraîcheur (${maxAgeMinutes} min).`,
      field: "capturedAt",
    };
  }
  return null;
}

export function checkDeviceOnline(status: DeviceStatus): QualityIssue | null {
  if (status === "FAULT") {
    return { severity: "error", code: "DEVICE_FAULT", message: "L'appareil est en défaut.", field: "status" };
  }
  if (status === "OFFLINE") {
    return { severity: "warning", code: "DEVICE_OFFLINE", message: "L'appareil est hors ligne.", field: "status" };
  }
  return null;
}

/** No measurement at all within the freshness window — distinct from a stale-but-present reading. */
export function checkMissingReading(hasAnyMeasurement: boolean): QualityIssue | null {
  if (!hasAnyMeasurement) {
    return { severity: "warning", code: "MISSING_READING", message: "Aucune mesure disponible pour ce capteur." };
  }
  return null;
}
