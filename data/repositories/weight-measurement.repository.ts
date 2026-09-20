import { eq } from "drizzle-orm";
import type { WeightMeasurementRepository } from "../../domain/production/repositories";
import type { NewWeightMeasurementRecord, WeightMeasurementRecord } from "../../domain/production/types";
import { db } from "../db/client";
import { weightMeasurementRecords } from "../db/schema";

export class DrizzleWeightMeasurementRepository implements WeightMeasurementRepository {
  async findById(id: string): Promise<WeightMeasurementRecord | null> {
    const row = await db.query.weightMeasurementRecords.findFirst({ where: eq(weightMeasurementRecords.id, id) });
    return row ?? null;
  }

  async listByLot(lotId: string): Promise<WeightMeasurementRecord[]> {
    return db.query.weightMeasurementRecords.findMany({
      where: eq(weightMeasurementRecords.lotId, lotId),
      orderBy: (t, { desc }) => desc(t.occurredAt),
    });
  }

  async create(input: NewWeightMeasurementRecord): Promise<WeightMeasurementRecord> {
    const [row] = await db.insert(weightMeasurementRecords).values(input).returning();
    return row;
  }
}
