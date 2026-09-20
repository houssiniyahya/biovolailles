"use server";

import { repositories } from "@/data/repositories";
import { requireSession } from "@/services/auth/session";
import { isWithinScope, resolveBuildingHierarchy } from "@/services/identity/scope-check";
import { computeLiveReading } from "@/services/iot/live-reading";

export interface LiveReadingPayload {
  value: number;
  unit: string;
  capturedAt: string;
}

/** Called by the client poller on the sensor detail page — every Server Action is an untrusted entry point, so scope is re-checked here even though the page that renders the trigger already checked it. */
export async function getLiveReadingAction(sensorId: string): Promise<LiveReadingPayload | null> {
  const session = await requireSession();

  const sensor = await repositories.sensors.findById(sensorId);
  if (!sensor) return null;
  const device = await repositories.devices.findById(sensor.deviceId);
  if (!device) return null;

  const path = await resolveBuildingHierarchy(device.buildingId);
  if (!isWithinScope(session, path)) return null;

  const reading = await computeLiveReading(sensorId);
  if (!reading) return null;
  return { value: reading.value, unit: reading.unit, capturedAt: reading.capturedAt };
}
