import type { AuditLogEntry, NewAuditLogEntry } from "./types";

/** All fields optional/ANDed — the /audit page's search+filter bar (phase-8 brief §9). */
export interface AuditLogFilters {
  actorId?: string;
  entityType?: string;
  entityId?: string;
  relatedLotId?: string;
  /** ISO datetime, inclusive lower bound on createdAt. */
  from?: string;
  /** ISO datetime, inclusive upper bound on createdAt. */
  to?: string;
  /** Free-text match over entityType/field/reason/oldValue/newValue. */
  q?: string;
}

/** Core for this phase — every mutating Server Action writes through this. */
export interface AuditLogRepository {
  list(limit?: number): Promise<AuditLogEntry[]>;
  listByEntity(entityType: string, entityId: string): Promise<AuditLogEntry[]>;
  search(filters: AuditLogFilters, limit?: number): Promise<AuditLogEntry[]>;
  record(entry: NewAuditLogEntry): Promise<AuditLogEntry>;
}
