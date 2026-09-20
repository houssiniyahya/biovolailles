import { repositories } from "../../data/repositories";
import { recordLotEventWithPopulationUpdate } from "../../data/repositories/transactions";
import { isSupportedEventType, validateEventPayload, type SupportedEventType } from "../../domain/production/event-payloads";
import { applyMortality } from "../../domain/production/population";
import type { LotEvent, NewLotEvent } from "../../domain/production/types";
import type { EventType } from "../../domain/shared/enums";
import { AuthorizationError, ValidationError } from "../../domain/shared/errors";
import { can } from "../../domain/shared/permissions";
import { recordAudit } from "../audit/record";
import type { Session } from "../auth/session";
import { assertInScope, resolveLotHierarchy } from "../identity/scope-check";
import { getLotOrThrow } from "./lot";

/**
 * Records a lot event and, for event types that affect population (currently MORTALITE),
 * atomically updates the lot's currentPopulation in the same transaction — see
 * data/repositories/transactions.ts. This is the only path population ever moves through;
 * see ARCHITECTURE.md §7 and the phase-2 brief §17.
 */
export async function createLotEvent(lotId: string, eventType: EventType, rawPayload: unknown, session: Session): Promise<LotEvent> {
  if (!can(session, "CREATE", "EVENTS")) {
    throw new AuthorizationError("Vous n'avez pas les droits pour enregistrer un événement.");
  }

  const lot = await getLotOrThrow(lotId);
  const path = await resolveLotHierarchy(lotId);
  assertInScope(session, path);

  if (!isSupportedEventType(eventType)) {
    throw new ValidationError(`Le type d'événement "${eventType}" n'est pas encore disponible dans cette phase.`);
  }
  const supportedType: SupportedEventType = eventType;

  const parsedPayload = validateEventPayload(supportedType, rawPayload);
  if (!parsedPayload.success) {
    throw new ValidationError(parsedPayload.error.issues.map((issue) => issue.message).join(" "));
  }

  let newPopulation: number | null = null;
  if (supportedType === "MORTALITE") {
    const { quantity } = parsedPayload.data as { quantity: number };
    const result = applyMortality(lot.currentPopulation, quantity);
    if (!result.ok) throw new ValidationError(result.error);
    newPopulation = result.value;
  }

  const eventInput: NewLotEvent = {
    lotId,
    eventType: supportedType,
    payload: parsedPayload.data,
    occurredAt: new Date().toISOString(),
    actorId: session.userId,
    dataStatus: lot.dataStatus,
    sourceType: "MANUEL",
    sourceId: null,
    deviceId: null,
    measurementMethod: null,
    validationStatus: null,
  };

  const { event } = await recordLotEventWithPopulationUpdate(
    eventInput,
    newPopulation === null ? null : { lotId, currentPopulation: newPopulation }
  );

  if (newPopulation !== null) {
    await recordAudit({
      actorId: session.userId,
      entityType: "lot",
      entityId: lotId,
      field: "currentPopulation",
      oldValue: String(lot.currentPopulation),
      newValue: String(newPopulation),
      reason: `Mortalité enregistrée (événement ${event.id})`,
      relatedLotId: lotId,
      relatedEventId: event.id,
    });
  }

  return event;
}

export async function listLotEvents(lotId: string, session: Session): Promise<LotEvent[]> {
  const path = await resolveLotHierarchy(lotId);
  assertInScope(session, path);
  return repositories.lotEvents.listByLot(lotId);
}
