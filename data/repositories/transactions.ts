import { eq } from "drizzle-orm";
import type {
  FeedUsageRecord,
  Lot,
  LotEvent,
  MortalityRecord,
  NewFeedUsageRecord,
  NewLotEvent,
  NewMortalityRecord,
  NewWeightMeasurementRecord,
  WeightMeasurementRecord,
} from "../../domain/production/types";
import { db } from "../db/client";
import { feedUsageRecords, lotEvents, lots, mortalityRecords, weightMeasurementRecords } from "../db/schema";

/**
 * The one place this codebase steps outside the repository abstraction to use a real
 * DB transaction — recording a population-affecting event (e.g. MORTALITE) must not be
 * able to leave the event logged but the population stale (or vice versa) if the process
 * dies mid-write. This is narrow and explicit on purpose rather than threading a `tx`
 * parameter through every repository method for the sake of one call site.
 */
export async function recordLotEventWithPopulationUpdate(
  eventInput: NewLotEvent,
  populationUpdate: { lotId: string; currentPopulation: number } | null
): Promise<{ event: LotEvent; lot: Lot | null }> {
  return db.transaction(async (tx) => {
    const [event] = await tx.insert(lotEvents).values(eventInput).returning();
    let lot: Lot | null = null;
    if (populationUpdate) {
      const [updated] = await tx
        .update(lots)
        .set({ currentPopulation: populationUpdate.currentPopulation })
        .where(eq(lots.id, populationUpdate.lotId))
        .returning();
      lot = updated;
    }
    return { event: event as LotEvent, lot };
  });
}

/**
 * Phase 3: MORTALITE, ALIMENTATION and PESEE now also have dedicated structured tables
 * (feed_usage_records / weight_measurement_records / mortality_records) carrying full
 * provenance — the lot_events timeline entry stays (existing UI reads it), but the
 * structured row is the source of truth for analytics/quality. Both are written in the
 * same transaction, linked via lot_events.sourceId -> the structured record's id, so
 * neither can exist without the other.
 */
export async function recordMortalityWithPopulationUpdate(
  mortalityInput: NewMortalityRecord,
  eventInput: Omit<NewLotEvent, "sourceId">,
  currentPopulation: number
): Promise<{ record: MortalityRecord; event: LotEvent; lot: Lot }> {
  return db.transaction(async (tx) => {
    const [record] = await tx.insert(mortalityRecords).values(mortalityInput).returning();
    const [event] = await tx
      .insert(lotEvents)
      .values({ ...eventInput, sourceId: record.id })
      .returning();
    const [lot] = await tx
      .update(lots)
      .set({ currentPopulation })
      .where(eq(lots.id, mortalityInput.lotId))
      .returning();
    return { record, event: event as LotEvent, lot };
  });
}

export async function recordFeedUsageWithEvent(
  feedInput: NewFeedUsageRecord,
  eventInput: Omit<NewLotEvent, "sourceId">
): Promise<{ record: FeedUsageRecord; event: LotEvent }> {
  return db.transaction(async (tx) => {
    const [record] = await tx.insert(feedUsageRecords).values(feedInput).returning();
    const [event] = await tx
      .insert(lotEvents)
      .values({ ...eventInput, sourceId: record.id })
      .returning();
    return { record, event: event as LotEvent };
  });
}

export async function recordWeightMeasurementWithEvent(
  weightInput: NewWeightMeasurementRecord,
  eventInput: Omit<NewLotEvent, "sourceId">
): Promise<{ record: WeightMeasurementRecord; event: LotEvent }> {
  return db.transaction(async (tx) => {
    const [record] = await tx.insert(weightMeasurementRecords).values(weightInput).returning();
    const [event] = await tx
      .insert(lotEvents)
      .values({ ...eventInput, sourceId: record.id })
      .returning();
    return { record, event: event as LotEvent };
  });
}
