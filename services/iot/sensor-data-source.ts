import type { Device, NewMeasurement, Sensor } from "../../domain/iot/types";

export interface SimulationAnomalyWindow {
  start: Date;
  end: Date;
  /** Added on top of the normal value at the window's midpoint, ramping up/down — never an instant jump. */
  peakOffset: number;
}

export interface SimulationContext {
  lotId: string | null;
  /** Used for age-based curves (weight, temperature target). Null means "no active lot in this building right now". */
  lotStartedAt: string | null;
  anomalyWindow?: SimulationAnomalyWindow;
}

/**
 * The abstraction ARCHITECTURE.md §9 called for: something that turns "this sensor, over
 * this time range" into measurements, so a real ingestion pipeline (MQTT/gateway) can
 * implement the same interface later without the UI or storage layer changing at all.
 */
export interface SensorDataSource {
  generate(
    sensor: Sensor,
    device: Device,
    context: SimulationContext,
    range: { from: Date; to: Date },
    intervalMinutes: number
  ): NewMeasurement[];
}
