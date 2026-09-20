import { truncateAllTables } from "../../data/db/truncate";
import { repositories } from "../../data/repositories";
import { seedDatabase, HERO_LOT_CODE } from "../../data/seed/seed-database";
import { seedHeroPerformanceAnomaly } from "../../data/seed/generators/hero-performance-anomaly";
import { AuthorizationError, ConflictError, NotFoundError } from "../../domain/shared/errors";
import { can } from "../../domain/shared/permissions";
import { env } from "../../lib/env";
import { logger } from "../../lib/logger";
import { recordAudit } from "../audit/record";
import type { Session } from "../auth/session";
import { runLotDetection } from "../intelligence/detection";

/** Same fixed evaluation instant the seed uses, so a replayed anomaly is identical to a seeded one. */
const LOT_DETECTION_NOW = new Date("2026-08-16T00:00:00.000Z");

export interface AnomalyScenarioResult {
  heroLotId: string;
  anomalyCount: number;
}

/**
 * Presenter controls for the "normal → deviation → anomaly → alert" story (phase-15 brief §5).
 *
 * The point of these two functions is that NOTHING is faked. `resetHeroToNormal` reseeds the
 * whole dataset with the hero lot's two deviation records omitted; `triggerHeroAnomaly` writes
 * those same records through the same generator the seed uses and then runs the REAL rule
 * engine over the lot. The anomaly the jury sees appear is computed by
 * services/intelligence/detection.ts from persisted measurements — there is no pre-baked alert
 * card anywhere in this file.
 *
 * Guards are identical to services/demo/reset.ts: DEMO_MODE on, SETTINGS:EDIT held, and the
 * database must actually be the demo dataset.
 */
function assertDemoControlAllowed(session: Session): void {
  if (!env.DEMO_MODE) {
    throw new AuthorizationError("Les commandes de démonstration sont désactivées sur cet environnement.");
  }
  if (!can(session, "EDIT", "SETTINGS")) {
    throw new AuthorizationError("Vous n'avez pas les droits pour piloter le scénario de démonstration.");
  }
}

async function assertIsDemoDatabase(): Promise<void> {
  const demoAdmin = await repositories.users.findByEmail("admin@biovolailles.demo");
  if (!demoAdmin) {
    throw new ConflictError(
      "Cette base ne correspond pas au jeu de démonstration attendu — commande refusée par sécurité."
    );
  }
}

/**
 * Rewinds to a hero lot with no performance problem: same farm, same building, same IoT
 * history, same traceability chain — just no feed spike and no growth check, so the rule
 * engine finds nothing on BU-2026-001 and the lot reads as a normal flock.
 *
 * Implemented as a full deterministic reseed rather than by deleting rows: the repositories
 * are deliberately append-only for production data, and a demo control is not a reason to
 * open a delete path into them.
 */
export async function resetHeroToNormal(session: Session): Promise<AnomalyScenarioResult> {
  assertDemoControlAllowed(session);
  await assertIsDemoDatabase();

  logger.warn("demo", `Hero lot rewind to normal requested by user ${session.userId} — reseeding without the deviation.`);
  await truncateAllTables();
  const result = await seedDatabase({ withoutHeroAnomaly: true });

  await recordAudit({
    actorId: null, // the acting user's row was just recreated with a new id
    entityType: "demo_scenario",
    entityId: result.heroLotId,
    field: null,
    oldValue: null,
    newValue: "HERO_NORMAL",
    reason: "Scénario de démonstration ramené à l'état normal (sans anomalie)",
    relatedLotId: result.heroLotId,
    relatedEventId: null,
  });

  logger.info("demo", "Hero lot is now in its normal state.");
  return { heroLotId: result.heroLotId, anomalyCount: result.anomalyCount };
}

/**
 * Writes the deviation — a feed record above the lot's recent pattern and a weighing showing a
 * growth check — then runs the real rule engine. Idempotent in effect: if the anomalies are
 * already open, detection will not duplicate them.
 */
export async function triggerHeroAnomaly(session: Session): Promise<AnomalyScenarioResult> {
  assertDemoControlAllowed(session);
  await assertIsDemoDatabase();

  const heroLot = await repositories.lots.findByCode(HERO_LOT_CODE);
  if (!heroLot) throw new NotFoundError("Lot", HERO_LOT_CODE);

  /*
   * Guard against a double click on stage. The rule engine already refuses to duplicate an
   * open anomaly, so a second press would not change what the jury sees — but it WOULD write a
   * second copy of the deviation records, quietly drifting the dataset away from the
   * deterministic start state. Bail out instead.
   */
  const existingAnomalies = await repositories.anomalies.listByLot(heroLot.id);
  if (existingAnomalies.length > 0) {
    logger.info("demo", "Hero anomaly already present — trigger ignored.");
    return { heroLotId: heroLot.id, anomalyCount: 0 };
  }

  logger.warn("demo", `Hero anomaly scenario triggered by user ${session.userId}.`);
  await seedHeroPerformanceAnomaly(heroLot.id);

  const { created } = await runLotDetection(heroLot.id, session, LOT_DETECTION_NOW);

  await recordAudit({
    actorId: session.userId,
    entityType: "demo_scenario",
    entityId: heroLot.id,
    field: null,
    oldValue: null,
    newValue: "HERO_ANOMALY_TRIGGERED",
    reason: `Déclenchement du scénario d'anomalie — ${created.length} anomalie(s) détectée(s) par le moteur de règles`,
    relatedLotId: heroLot.id,
    relatedEventId: null,
  });

  logger.info("demo", `Rule engine raised ${created.length} anomaly(ies) on the hero lot.`);
  return { heroLotId: heroLot.id, anomalyCount: created.length };
}
