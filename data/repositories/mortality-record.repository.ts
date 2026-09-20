import { eq } from "drizzle-orm";
import type { MortalityRecordRepository } from "../../domain/production/repositories";
import type { MortalityRecord, NewMortalityRecord } from "../../domain/production/types";
import { db } from "../db/client";
import { mortalityRecords } from "../db/schema";

export class DrizzleMortalityRecordRepository implements MortalityRecordRepository {
  async findById(id: string): Promise<MortalityRecord | null> {
    const row = await db.query.mortalityRecords.findFirst({ where: eq(mortalityRecords.id, id) });
    return row ?? null;
  }

  async listByLot(lotId: string): Promise<MortalityRecord[]> {
    return db.query.mortalityRecords.findMany({
      where: eq(mortalityRecords.lotId, lotId),
      orderBy: (t, { desc }) => desc(t.occurredAt),
    });
  }

  async create(input: NewMortalityRecord): Promise<MortalityRecord> {
    const [row] = await db.insert(mortalityRecords).values(input).returning();
    return row;
  }
}
