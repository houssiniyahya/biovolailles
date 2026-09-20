import { repositories } from "../../data/repositories";
import type { AuditLogFilters } from "../../domain/audit/repositories";
import type { AuditLogEntry } from "../../domain/audit/types";
import { AuthorizationError } from "../../domain/shared/errors";
import { can } from "../../domain/shared/permissions";
import { isGlobalScope } from "../../domain/shared/scope";
import type { Session } from "../auth/session";
import { isWithinScope, resolveLotHierarchy } from "../identity/scope-check";

/**
 * The /audit page's search (phase-8 brief §9), scoped server-side. Today AUDIT permission is
 * only ever granted to GLOBAL-scoped roles (SUPER_ADMIN, AUDITOR — domain/shared/permissions.ts),
 * so the non-global branch below is defensive: it restricts to entries whose relatedLotId sits
 * in the caller's scope, and drops anything with no lot linkage (a scoped viewer has no basis
 * to see e.g. another scope's user-management or settings changes).
 */
export async function searchAuditLog(filters: AuditLogFilters, session: Session, limit?: number): Promise<AuditLogEntry[]> {
  if (!can(session, "VIEW", "AUDIT")) {
    throw new AuthorizationError("Vous n'avez pas les droits pour consulter le journal d'audit.");
  }
  const entries = await repositories.auditLog.search(filters, limit);
  if (isGlobalScope(session)) return entries;

  const lotIds = [...new Set(entries.map((e) => e.relatedLotId).filter((id): id is string => id !== null))];
  const inScopeLotIds = new Set<string>();
  await Promise.all(
    lotIds.map(async (id) => {
      try {
        const path = await resolveLotHierarchy(id);
        if (isWithinScope(session, path)) inScopeLotIds.add(id);
      } catch {
        // Lot no longer resolves (deleted/inconsistent) — excluded rather than shown to a scoped viewer.
      }
    })
  );

  return entries.filter((e) => e.relatedLotId !== null && inScopeLotIds.has(e.relatedLotId));
}
