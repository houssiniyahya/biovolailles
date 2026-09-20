import { repositories } from "../../data/repositories";
import type { Role, ScopeType } from "../../domain/shared/enums";
import type { Session } from "../auth/session";

/**
 * Creates a real `users` row and returns a matching Session — lot_events.actorId is a
 * genuine foreign key to users.id (ARCHITECTURE.md's "a record must never exist in an
 * invalid hierarchy"), so tests need a real user behind every session, not a made-up id.
 */
export async function createTestSession(
  role: Role,
  scopeType: ScopeType,
  scopeId: string | null,
  suffix: string
): Promise<Session> {
  const user = await repositories.users.create({
    email: `${suffix.toLowerCase()}-${role.toLowerCase()}@test.local`,
    passwordHash: "test-hash",
    fullName: `Test User ${suffix}`,
    role,
    scopeType,
    scopeId,
    active: true,
  });
  return { userId: user.id, role, scopeType, scopeId, isDemoSwitch: false };
}
