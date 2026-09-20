import { eq } from "drizzle-orm";
import type { WaterUsageRepository } from "../../domain/production/repositories";
import type { NewWaterUsageRecord, WaterUsageRecord } from "../../domain/production/types";
import { db } from "../db/client";
import { waterUsageRecords } from "../db/schema";

export class DrizzleWaterUsageRepository implements WaterUsageRepository {
  async findById(id: string): Promise<WaterUsageRecord | null> {
    const row = await db.query.waterUsageRecords.findFirst({ where: eq(waterUsageRecords.id, id) });
    return row ?? null;
  }

  async listByLot(lotId: string): Promise<WaterUsageRecord[]> {
    return db.query.waterUsageRecords.findMany({
      where: eq(waterUsageRecords.lotId, lotId),
      orderBy: (t, { desc }) => desc(t.occurredAt),
    });
  }

  async listByBuilding(buildingId: string): Promise<WaterUsageRecord[]> {
    return db.query.waterUsageRecords.findMany({
      where: eq(waterUsageRecords.buildingId, buildingId),
      orderBy: (t, { desc }) => desc(t.occurredAt),
    });
  }

  async create(input: NewWaterUsageRecord): Promise<WaterUsageRecord> {
    const [row] = await db.insert(waterUsageRecords).values(input).returning();
    return row;
  }
}
