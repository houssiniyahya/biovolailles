import { err, ok, type Result } from "../shared/result";

/**
 * Population integrity (ARCHITECTURE.md §7): current_population is never written directly
 * by the UI — it is only ever derived by applying a validated event on top of the lot's
 * current state. This phase implements the MORTALITE path; other event types (PESEE,
 * ALIMENTATION, TRANSFERT, AUTRE) do not affect population and are left as pure log entries
 * until later phases model entries/exits/collections in full.
 */
export function applyMortality(currentPopulation: number, quantity: number): Result<number, string> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return err("La mortalité déclarée doit être un nombre entier positif.");
  }
  if (quantity > currentPopulation) {
    return err(
      `La mortalité déclarée (${quantity}) dépasse la population actuelle du lot (${currentPopulation}).`
    );
  }
  return ok(currentPopulation - quantity);
}

export function validateInitialPopulation(value: number): Result<number, string> {
  if (!Number.isInteger(value) || value <= 0) {
    return err("La population initiale doit être un nombre entier positif.");
  }
  return ok(value);
}
