import { eq } from "drizzle-orm";
import type { EnvironmentMeasurementRepository } from "../../domain/production/repositories";
import type { EnvironmentMeasurementRecord, NewEnvironmentMeasurementRecord } from "../../domain/production/types";
import { db } from "../db/client";
import { environmentMeasurementRecords } from "../db/schema";

export class DrizzleEnvironmentMeasurementRepository implements EnvironmentMeasurementRepository {
  async findById(id: string): Promise<EnvironmentMeasurementRecord | null> {
    const row = await db.query.environmentMeasurementRecords.findFirst({
      where: eq(environmentMeasurementRecords.id, id),
    });
    return row ?? null;
  }

  async listByLot(lotId: string): Promise<EnvironmentMeasurementRecord[]> {
    return db.query.environmentMeasurementRecords.findMany({
      where: eq(environmentMeasurementRecords.lotId, lotId),
      orderBy: (t, { desc }) => desc(t.occurredAt),
    });
  }

  async listByBuilding(buildingId: string): Promise<EnvironmentMeasurementRecord[]> {
    return db.query.environmentMeasurementRecords.findMany({
      where: eq(environmentMeasurementRecords.buildingId, buildingId),
      orderBy: (t, { desc }) => desc(t.occurredAt),
    });
  }

  async create(input: NewEnvironmentMeasurementRecord): Promise<EnvironmentMeasurementRecord> {
    const [row] = await db.insert(environmentMeasurementRecords).values(input).returning();
    return row;
  }
}
