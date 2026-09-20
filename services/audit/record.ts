import { repositories } from "../../data/repositories";
import type { NewAuditLogEntry } from "../../domain/audit/types";

/** Called from within the same service/action as the mutation itself — see ARCHITECTURE.md §13. */
export async function recordAudit(entry: NewAuditLogEntry): Promise<void> {
  await repositories.auditLog.record(entry);
}
