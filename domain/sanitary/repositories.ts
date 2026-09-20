import type { NewSanitaryObservation, SanitaryObservation } from "./types";

/**
 * Modelled but NOT implemented. There is a `sanitary_observations` table in the schema and a
 * type for it, but no Drizzle repository, no service, no UI, and the seed never writes a row —
 * so sanitary observation is not a capability this MVP has, and nothing in the product or the
 * documentation claims otherwise (see RELEASE_NOTES.md §3).
 *
 * Kept rather than deleted because dropping the table would mean a destructive migration for
 * no functional gain. It is the shape a later phase would fill in, not a half-built feature
 * users can reach.
 */
export interface SanitaryObservationRepository {
  listByLot(lotId: string): Promise<SanitaryObservation[]>;
  create(input: NewSanitaryObservation): Promise<SanitaryObservation>;
}
