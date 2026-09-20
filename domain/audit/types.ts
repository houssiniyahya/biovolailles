export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  entityType: string;
  entityId: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  relatedLotId: string | null;
  relatedEventId: string | null;
  createdAt: string;
}

export type NewAuditLogEntry = Omit<AuditLogEntry, "id" | "createdAt">;
