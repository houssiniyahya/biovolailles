import type { Device, Measurement, NewDevice, NewMeasurement, NewSensor, Sensor } from "./types";

/** Core aggregate — fully implemented against Drizzle as of Phase 4. */
export interface DeviceRepository {
  findById(id: string): Promise<Device | null>;
  findByCode(code: string): Promise<Device | null>;
  listByBuilding(buildingId: string): Promise<Device[]>;
  list(): Promise<Device[]>;
  create(input: NewDevice): Promise<Device>;
  update(
    id: string,
    patch: Partial<Pick<Device, "status" | "lastCommunicationAt" | "batteryLevel" | "signalQuality">>
  ): Promise<Device>;
}

export interface SensorRepository {
  findById(id: string): Promise<Sensor | null>;
  listByDevice(deviceId: string): Promise<Sensor[]>;
  create(input: NewSensor): Promise<Sensor>;
  updateStatus(id: string, status: Sensor["status"]): Promise<Sensor>;
}

export interface MeasurementRepository {
  findById(id: string): Promise<Measurement | null>;
  listBySensor(sensorId: string, range?: { from: string; to: string }): Promise<Measurement[]>;
  listByBuilding(buildingId: string, range?: { from: string; to: string }): Promise<Measurement[]>;
  listByLot(lotId: string, range?: { from: string; to: string }): Promise<Measurement[]>;
  /** Most recent reading per sensor for a building — the "current value" cards. */
  latestByBuilding(buildingId: string): Promise<Measurement[]>;
  create(input: NewMeasurement): Promise<Measurement>;
  createMany(inputs: NewMeasurement[]): Promise<Measurement[]>;
}
