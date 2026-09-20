import { repositories } from "../../data/repositories";
import type { NewMeasurement } from "../../domain/iot/types";
import { DeterministicSensorSimulator } from "./simulator";

const simulator = new DeterministicSensorSimulator();

/**
 * Computes "what would this sensor read right now" without writing to the database —
 * phase-4 brief §17 explicitly warns against uncontrolled high-frequency writes, so the
 * LIVE badge polls this pure computation instead of inserting a row on every poll. The
 * persisted history (seeded) is what the measurement-history chart reads from.
 */
export async function computeLiveReading(sensorId: string, now: Date = new Date()): Promise<NewMeasurement | null> {
  const sensor = await repositories.sensors.findById(sensorId);
  if (!sensor) return null;
  const device = await repositories.devices.findById(sensor.deviceId);
  if (!device) return null;

  const buildingLots = await repositories.lots.listByBuilding(device.buildingId);
  const activeLot = buildingLots.find((lot) => lot.status === "ACTIF") ?? null;

  const [reading] = simulator.generate(
    sensor,
    device,
    { lotId: activeLot?.id ?? null, lotStartedAt: activeLot?.startedAt ?? null },
    { from: now, to: now },
    1
  );
  return reading ?? null;
}
