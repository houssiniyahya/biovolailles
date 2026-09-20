"use server";

import { revalidatePath } from "next/cache";
import type { PublicError } from "@/domain/shared/errors";
import type { IntegrityCheckCode } from "@/domain/integrity/types";
import { handleActionError } from "@/lib/handle-error";
import { acknowledgeIntegrityIssue } from "@/services/integrity/acknowledge";
import { requireSession } from "@/services/auth/session";

export interface ActionResult {
  ok: boolean;
  error?: PublicError;
}

export async function acknowledgeIntegrityIssueAction(
  code: IntegrityCheckCode,
  entityType: string,
  entityId: string,
  description: string,
  note?: string
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await acknowledgeIntegrityIssue({ code, entityType, entityId, description }, session, note);
    revalidatePath("/integrite");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}
