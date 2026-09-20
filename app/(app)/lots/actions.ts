"use server";

import { revalidatePath } from "next/cache";
import type { PublicError } from "@/domain/shared/errors";
import type { EventType, LotStatus } from "@/domain/shared/enums";
import { handleActionError } from "@/lib/handle-error";
import { requireSession } from "@/services/auth/session";
import { runLotDetection } from "@/services/intelligence/detection";
import { createLot, updateLot, type CreateLotInput, type UpdateLotInput } from "@/services/production/lot";
import { createLotEvent } from "@/services/production/lot-events";
import { transitionLotStatus } from "@/services/production/lot-lifecycle";
import { createLotQrToken, createProductQrToken, revokeQrToken } from "@/services/traceability/qr-tokens";

export interface ActionResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: PublicError;
}

export async function createLotAction(input: CreateLotInput): Promise<ActionResult<{ lotId: string }>> {
  try {
    const session = await requireSession();
    const lot = await createLot(input, session);
    revalidatePath("/lots");
    return { ok: true, data: { lotId: lot.id } };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}

export async function updateLotAction(lotId: string, input: UpdateLotInput): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await updateLot(lotId, input, session);
    revalidatePath(`/lots/${lotId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}

export async function transitionLotStatusAction(lotId: string, toStatus: LotStatus, reason?: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await transitionLotStatus(lotId, toStatus, session, reason);
    revalidatePath(`/lots/${lotId}`);
    revalidatePath("/lots");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}

export async function createLotEventAction(lotId: string, eventType: EventType, payload: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await createLotEvent(lotId, eventType, payload, session);
    revalidatePath(`/lots/${lotId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}

export async function createLotQrTokenAction(lotId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await createLotQrToken(lotId, session);
    revalidatePath(`/lots/${lotId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}

export async function createProductQrTokenAction(productId: string, originLotId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await createProductQrToken(productId, originLotId, session);
    revalidatePath(`/lots/${originLotId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}

export async function revokeQrTokenAction(tokenId: string, lotId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await revokeQrToken(tokenId, session);
    revalidatePath(`/lots/${lotId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}

export async function runLotDetectionAction(lotId: string): Promise<ActionResult<{ created: number }>> {
  try {
    const session = await requireSession();
    const { created } = await runLotDetection(lotId, session);
    revalidatePath(`/lots/${lotId}`);
    revalidatePath("/alertes");
    revalidatePath("/anomalies");
    revalidatePath("/dashboard");
    return { ok: true, data: { created: created.length } };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}
