import { eq } from "drizzle-orm";
import type { SensorRepository } from "../../domain/iot/repositories";
import type { NewSensor, Sensor } from "../../domain/iot/types";
import { NotFoundError } from "../../domain/shared/errors";
import { db } from "../db/client";
import { sensors } from "../db/schema";

export class DrizzleSensorRepository implements SensorRepository {
  async findById(id: string): Promise<Sensor | null> {
    const row = await db.query.sensors.findFirst({ where: eq(sensors.id, id) });
    return (row as Sensor | undefined) ?? null;
  }

  async listByDevice(deviceId: string): Promise<Sensor[]> {
    const rows = await db.query.sensors.findMany({ where: eq(sensors.deviceId, deviceId) });
    return rows as Sensor[];
  }

  async create(input: NewSensor): Promise<Sensor> {
    const [row] = await db.insert(sensors).values(input).returning();
    return row as Sensor;
  }

  async updateStatus(id: string, status: Sensor["status"]): Promise<Sensor> {
    const [row] = await db.update(sensors).set({ status }).where(eq(sensors.id, id)).returning();
    if (!row) throw new NotFoundError("Sensor", id);
    return row as Sensor;
  }
}
