"use server";

import { revalidatePath } from "next/cache";
import type { PublicError } from "@/domain/shared/errors";
import type { Role, ScopeType } from "@/domain/shared/enums";
import { handleActionError } from "@/lib/handle-error";
import { requireSession } from "@/services/auth/session";
import { createUser, setUserActive, updateUserRole, updateUserScope, type CreateUserInput } from "@/services/identity/user-management";

export interface ActionResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: PublicError;
}

export async function createUserAction(input: CreateUserInput): Promise<ActionResult<{ userId: string }>> {
  try {
    const session = await requireSession();
    const user = await createUser(input, session);
    revalidatePath("/utilisateurs");
    return { ok: true, data: { userId: user.id } };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}

export async function updateUserRoleAction(userId: string, role: Role, reason?: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await updateUserRole(userId, role, session, reason);
    revalidatePath("/utilisateurs");
    revalidatePath(`/utilisateurs/${userId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}

export async function updateUserScopeAction(
  userId: string,
  scopeType: ScopeType,
  scopeId: string | null,
  reason?: string
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await updateUserScope(userId, scopeType, scopeId, session, reason);
    revalidatePath("/utilisateurs");
    revalidatePath(`/utilisateurs/${userId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}

export async function setUserActiveAction(userId: string, active: boolean, reason?: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await setUserActive(userId, active, session, reason);
    revalidatePath("/utilisateurs");
    revalidatePath(`/utilisateurs/${userId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}
