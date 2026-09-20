import { err, ok, type Result } from "../shared/result";

/**
 * Quantity-integrity formulas beyond population (phase-3 brief §15). None of these are
 * wired to live data yet — Phase 3 has no transfer/collection/slaughter/feed-stock records
 * to validate — but the functions exist now so the collection/slaughter/transformation and
 * feed-lot features due in later phases have a tested, ready-made rule to call.
 */

export function validateTransferQuantity(availableQuantity: number, transferredQuantity: number): Result<true, string> {
  if (transferredQuantity <= 0) return err("La quantité transférée doit être positive.");
  if (transferredQuantity > availableQuantity) {
    return err(`La quantité transférée (${transferredQuantity}) dépasse la quantité disponible (${availableQuantity}).`);
  }
  return ok(true);
}

/** incoming material = processed output + losses + rejects */
export function validateProcessingYield(
  incomingQuantity: number,
  outputQuantity: number,
  losses: number,
  rejects: number
): Result<true, string> {
  const accounted = outputQuantity + losses + rejects;
  if (accounted !== incomingQuantity) {
    return err(
      `La quantité entrante (${incomingQuantity}) ne correspond pas à la sortie + pertes + rejets (${accounted}).`
    );
  }
  return ok(true);
}

/** feed stock: initial + entries - consumption = final */
export function validateFeedStockBalance(
  initialStock: number,
  entries: number,
  consumption: number,
  finalStock: number
): Result<true, string> {
  const expected = initialStock + entries - consumption;
  if (expected !== finalStock) {
    return err(`Le stock final attendu (${expected}) ne correspond pas au stock final déclaré (${finalStock}).`);
  }
  return ok(true);
}
