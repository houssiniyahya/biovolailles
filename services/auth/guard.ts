import { redirect } from "next/navigation";
import type { Module } from "../../domain/shared/permissions";
import { canAccessModule } from "../../domain/shared/permissions";
import type { HierarchyPath } from "../identity/scope-check";
import { isWithinScope } from "../identity/scope-check";
import { getCurrentSession, type Session } from "./session";

/**
 * Page-level guards. Distinct from services/identity/scope-check.ts's assertInScope
 * (which throws — correct for Server Actions/services, where the caller catches and
 * returns a safe error) because a thrown Error's custom fields don't survive the
 * Server Component -> error boundary serialization. redirect() is a framework-native
 * control-flow signal that does survive it, so pages use that instead.
 */
export async function requireModuleAccess(module: Module): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!canAccessModule(session, module)) redirect("/non-autorise");
  return session;
}

export function redirectIfOutOfScope(session: Session, path: HierarchyPath): void {
  if (!isWithinScope(session, path)) redirect("/non-autorise");
}
