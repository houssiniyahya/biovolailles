import { eq } from "drizzle-orm";
import type { FeedUsageRepository } from "../../domain/production/repositories";
import type { FeedUsageRecord, NewFeedUsageRecord } from "../../domain/production/types";
import { db } from "../db/client";
import { feedUsageRecords } from "../db/schema";

export class DrizzleFeedUsageRepository implements FeedUsageRepository {
  async findById(id: string): Promise<FeedUsageRecord | null> {
    const row = await db.query.feedUsageRecords.findFirst({ where: eq(feedUsageRecords.id, id) });
    return row ?? null;
  }

  async listByLot(lotId: string): Promise<FeedUsageRecord[]> {
    return db.query.feedUsageRecords.findMany({
      where: eq(feedUsageRecords.lotId, lotId),
      orderBy: (t, { desc }) => desc(t.occurredAt),
    });
  }

  async create(input: NewFeedUsageRecord): Promise<FeedUsageRecord> {
    const [row] = await db.insert(feedUsageRecords).values(input).returning();
    return row;
  }
}
