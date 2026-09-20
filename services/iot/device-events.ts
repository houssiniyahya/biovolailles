import { repositories } from "../../data/repositories";
import type { EventType } from "../../domain/shared/enums";

export type DeviceEventType = Extract<EventType, "DEVICE_CONNECTED" | "DEVICE_OFFLINE" | "SENSOR_FAULT">;

/**
 * Surfaces a meaningful IoT event on the existing lot_events timeline (phase-4 brief §14)
 * — only when there's an active lot in the affected building to attach it to; lot_events
 * requires a lotId, and a building with no active lot has nothing to log against yet.
 */
export async function logDeviceEvent(input: {
  buildingId: string;
  deviceId: string;
  eventType: DeviceEventType;
  description: string;
  occurredAt: string;
}): Promise<void> {
  const lots = await repositories.lots.listByBuilding(input.buildingId);
  const activeLot = lots.find((lot) => lot.status === "ACTIF");
  if (!activeLot) return;

  await repositories.lotEvents.create({
    lotId: activeLot.id,
    eventType: input.eventType,
    payload: { description: input.description, deviceId: input.deviceId },
    occurredAt: input.occurredAt,
    actorId: null,
    dataStatus: "SIMULATION",
    sourceType: "SIMULATEUR",
    sourceId: input.deviceId,
    deviceId: input.deviceId,
    measurementMethod: null,
    validationStatus: null,
  });
}
