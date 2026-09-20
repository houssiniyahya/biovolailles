import { eq } from "drizzle-orm";
import type { ActionRecordRepository } from "../../domain/intelligence/repositories";
import type { ActionRecord, NewActionRecord } from "../../domain/intelligence/types";
import { db } from "../db/client";
import { actionRecords } from "../db/schema";

export class DrizzleActionRecordRepository implements ActionRecordRepository {
  async listByAlert(alertId: string): Promise<ActionRecord[]> {
    return db.query.actionRecords.findMany({
      where: eq(actionRecords.alertId, alertId),
      orderBy: (t, { desc }) => desc(t.performedAt),
    });
  }

  async create(input: NewActionRecord): Promise<ActionRecord> {
    const [row] = await db.insert(actionRecords).values(input).returning();
    return row;
  }
}
