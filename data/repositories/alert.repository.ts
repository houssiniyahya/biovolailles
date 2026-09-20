import { eq, inArray } from "drizzle-orm";
import type { AlertRepository } from "../../domain/intelligence/repositories";
import type { Alert, NewAlert } from "../../domain/intelligence/types";
import { NotFoundError } from "../../domain/shared/errors";
import { db } from "../db/client";
import { alerts } from "../db/schema";

export class DrizzleAlertRepository implements AlertRepository {
  async findById(id: string): Promise<Alert | null> {
    const row = await db.query.alerts.findFirst({ where: eq(alerts.id, id) });
    return row ?? null;
  }

  async list(): Promise<Alert[]> {
    return db.query.alerts.findMany({ orderBy: (t, { desc }) => desc(t.raisedAt) });
  }

  async findByAnomalyId(anomalyId: string): Promise<Alert | null> {
    const row = await db.query.alerts.findFirst({ where: eq(alerts.anomalyId, anomalyId) });
    return row ?? null;
  }

  async listByAnomalyIds(anomalyIds: string[]): Promise<Alert[]> {
    if (anomalyIds.length === 0) return [];
    return db.query.alerts.findMany({
      where: inArray(alerts.anomalyId, anomalyIds),
      orderBy: (t, { desc }) => desc(t.raisedAt),
    });
  }

  async create(input: NewAlert): Promise<Alert> {
    const [row] = await db.insert(alerts).values(input).returning();
    return row;
  }

  async updateStatus(id: string, status: Alert["status"], resolvedAt: string | null): Promise<Alert> {
    const [row] = await db.update(alerts).set({ status, resolvedAt }).where(eq(alerts.id, id)).returning();
    if (!row) throw new NotFoundError("Alert", id);
    return row;
  }
}
