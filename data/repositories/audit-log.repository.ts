import { and, desc, eq, gte, like, lte, or } from "drizzle-orm";
import type { AuditLogFilters, AuditLogRepository } from "../../domain/audit/repositories";
import type { AuditLogEntry, NewAuditLogEntry } from "../../domain/audit/types";
import { db } from "../db/client";
import { auditLog } from "../db/schema";

export class DrizzleAuditLogRepository implements AuditLogRepository {
  async list(limit = 100): Promise<AuditLogEntry[]> {
    return db.query.auditLog.findMany({ orderBy: desc(auditLog.createdAt), limit });
  }

  async listByEntity(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    return db.query.auditLog.findMany({
      where: and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)),
      orderBy: desc(auditLog.createdAt),
    });
  }

  async search(filters: AuditLogFilters, limit = 200): Promise<AuditLogEntry[]> {
    const conditions = [];
    if (filters.actorId) conditions.push(eq(auditLog.actorId, filters.actorId));
    if (filters.entityType) conditions.push(eq(auditLog.entityType, filters.entityType));
    if (filters.entityId) conditions.push(eq(auditLog.entityId, filters.entityId));
    if (filters.relatedLotId) conditions.push(eq(auditLog.relatedLotId, filters.relatedLotId));
    if (filters.from) conditions.push(gte(auditLog.createdAt, filters.from));
    if (filters.to) conditions.push(lte(auditLog.createdAt, filters.to));
    if (filters.q) {
      const needle = `%${filters.q}%`;
      conditions.push(
        or(
          like(auditLog.entityType, needle),
          like(auditLog.entityId, needle),
          like(auditLog.field, needle),
          like(auditLog.reason, needle),
          like(auditLog.oldValue, needle),
          like(auditLog.newValue, needle)
        )
      );
    }

    return db.query.auditLog.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: desc(auditLog.createdAt),
      limit,
    });
  }

  async record(entry: NewAuditLogEntry): Promise<AuditLogEntry> {
    const [row] = await db.insert(auditLog).values(entry).returning();
    return row;
  }
}
