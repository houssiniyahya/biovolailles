import { integrityIssueKey, type IntegrityIssue } from "../../domain/integrity/types";
import { AuthorizationError } from "../../domain/shared/errors";
import { can } from "../../domain/shared/permissions";
import { recordAudit } from "../audit/record";
import type { Session } from "../auth/session";

/**
 * Acknowledging an integrity issue writes an audit_log entry — it never hides or "resolves"
 * the issue itself (phase-8 brief §12: "do not allow someone to simply mark everything valid
 * without the underlying condition being fixed"). The issue keeps appearing in the next
 * runIntegrityChecks() computation, now annotated as ACKNOWLEDGED, until the underlying data
 * is actually fixed through the entity's own editing feature.
 */
export async function acknowledgeIntegrityIssue(
  issue: Pick<IntegrityIssue, "code" | "entityType" | "entityId" | "description">,
  session: Session,
  note?: string
): Promise<void> {
  if (!can(session, "EDIT", "INTEGRITY")) {
    throw new AuthorizationError("Vous n'avez pas les droits pour accuser réception d'un problème d'intégrité.");
  }

  await recordAudit({
    actorId: session.userId,
    entityType: "integrity_issue",
    entityId: integrityIssueKey(issue),
    field: issue.code,
    oldValue: null,
    newValue: "ACKNOWLEDGED",
    reason: note?.trim() ? note.trim() : issue.description,
    relatedLotId: null,
    relatedEventId: null,
  });
}
