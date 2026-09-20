import { and, eq, gte, lte } from "drizzle-orm";
import type { MeasurementRepository } from "../../domain/iot/repositories";
import type { Measurement, NewMeasurement } from "../../domain/iot/types";
import { db } from "../db/client";
import { measurements } from "../db/schema";

function rangeCondition(column: typeof measurements.capturedAt, range?: { from: string; to: string }) {
  if (!range) return undefined;
  return and(gte(column, range.from), lte(column, range.to));
}

export class DrizzleMeasurementRepository implements MeasurementRepository {
  async findById(id: string): Promise<Measurement | null> {
    const row = await db.query.measurements.findFirst({ where: eq(measurements.id, id) });
    return (row as Measurement | undefined) ?? null;
  }

  async listBySensor(sensorId: string, range?: { from: string; to: string }): Promise<Measurement[]> {
    const rangeClause = rangeCondition(measurements.capturedAt, range);
    const rows = await db.query.measurements.findMany({
      where: rangeClause ? and(eq(measurements.sensorId, sensorId), rangeClause) : eq(measurements.sensorId, sensorId),
      orderBy: (t, { desc }) => desc(t.capturedAt),
    });
    return rows as Measurement[];
  }

  async listByBuilding(buildingId: string, range?: { from: string; to: string }): Promise<Measurement[]> {
    const rangeClause = rangeCondition(measurements.capturedAt, range);
    const rows = await db.query.measurements.findMany({
      where: rangeClause ? and(eq(measurements.buildingId, buildingId), rangeClause) : eq(measurements.buildingId, buildingId),
      orderBy: (t, { desc }) => desc(t.capturedAt),
    });
    return rows as Measurement[];
  }

  async listByLot(lotId: string, range?: { from: string; to: string }): Promise<Measurement[]> {
    const rangeClause = rangeCondition(measurements.capturedAt, range);
    const rows = await db.query.measurements.findMany({
      where: rangeClause ? and(eq(measurements.lotId, lotId), rangeClause) : eq(measurements.lotId, lotId),
      orderBy: (t, { desc }) => desc(t.capturedAt),
    });
    return rows as Measurement[];
  }

  /** MVP-scale (dozens of sensors, thousands of readings) — one ordered fetch, grouped in JS. Not a real "latest per group" SQL query. */
  async latestByBuilding(buildingId: string): Promise<Measurement[]> {
    const rows = (await db.query.measurements.findMany({
      where: eq(measurements.buildingId, buildingId),
      orderBy: (t, { desc }) => desc(t.capturedAt),
    })) as Measurement[];

    const latestBySensor = new Map<string, Measurement>();
    for (const row of rows) {
      if (!latestBySensor.has(row.sensorId)) latestBySensor.set(row.sensorId, row);
    }
    return Array.from(latestBySensor.values());
  }

  async create(input: NewMeasurement): Promise<Measurement> {
    const [row] = await db.insert(measurements).values(input).returning();
    return row as Measurement;
  }

  async createMany(inputs: NewMeasurement[]): Promise<Measurement[]> {
    if (inputs.length === 0) return [];
    const rows = await db.insert(measurements).values(inputs).returning();
    return rows as Measurement[];
  }
}
