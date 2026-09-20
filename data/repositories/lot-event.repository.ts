import { desc, eq, inArray } from "drizzle-orm";
import type { LotEventRepository } from "../../domain/production/repositories";
import type { LotEvent, NewLotEvent } from "../../domain/production/types";
import { db } from "../db/client";
import { lotEvents } from "../db/schema";

export class DrizzleLotEventRepository implements LotEventRepository {
  async findById(id: string): Promise<LotEvent | null> {
    const row = await db.query.lotEvents.findFirst({ where: eq(lotEvents.id, id) });
    return (row as LotEvent | undefined) ?? null;
  }

  async listByLot(lotId: string): Promise<LotEvent[]> {
    const rows = await db.query.lotEvents.findMany({
      where: eq(lotEvents.lotId, lotId),
      orderBy: (t, { desc }) => desc(t.occurredAt),
    });
    return rows as LotEvent[];
  }

  async listRecentByLots(lotIds: string[], limit: number): Promise<LotEvent[]> {
    if (lotIds.length === 0) return [];
    const rows = await db
      .select()
      .from(lotEvents)
      .where(inArray(lotEvents.lotId, lotIds))
      .orderBy(desc(lotEvents.occurredAt))
      .limit(limit);
    return rows as LotEvent[];
  }

  async create(input: NewLotEvent): Promise<LotEvent> {
    const [row] = await db.insert(lotEvents).values(input).returning();
    return row as LotEvent;
  }
}
