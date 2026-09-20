"use server";

import { revalidatePath } from "next/cache";
import { DEMO_PASSWORD } from "@/data/seed/generators/hierarchy";
import type { PublicError } from "@/domain/shared/errors";
import { handleActionError } from "@/lib/handle-error";
import { login } from "@/services/auth/login";
import { requireSession } from "@/services/auth/session";
import { resetDemoScenario } from "@/services/demo/reset";
import { resetHeroToNormal, triggerHeroAnomaly } from "@/services/demo/anomaly-scenario";

export interface ResetActionResult {
  ok: boolean;
  error?: PublicError;
}

/**
 * Replays the deterministic hero scenario. The reset necessarily deletes and recreates the
 * `users` table, which invalidates the caller's own session (their user id no longer exists),
 * so this re-authenticates as the freshly-seeded demo admin afterwards — through the real
 * login() path, password check included, not by hand-editing the session cookie.
 */
export async function resetDemoScenarioAction(): Promise<ResetActionResult> {
  try {
    const session = await requireSession();
    await resetDemoScenario(session);
    await login("admin@biovolailles.demo", DEMO_PASSWORD);

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}

/**
 * Rewinds BU-2026-001 to a normal flock so the presenter can show the anomaly *appearing*
 * (phase-15 brief §5). Like the reset above it reseeds, so the caller's session must be
 * re-established afterwards.
 */
export async function resetHeroToNormalAction(): Promise<ResetActionResult> {
  try {
    const session = await requireSession();
    await resetHeroToNormal(session);
    await login("admin@biovolailles.demo", DEMO_PASSWORD);

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}

/**
 * Writes the deviation records and runs the real rule engine. Does NOT reseed, so the session
 * survives — this is the step the jury watches.
 */
export async function triggerHeroAnomalyAction(): Promise<ResetActionResult> {
  try {
    const session = await requireSession();
    await triggerHeroAnomaly(session);

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: handleActionError("server-action", error) };
  }
}
