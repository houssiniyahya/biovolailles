import { createHash, randomBytes } from "node:crypto";
import { repositories } from "../../data/repositories";
import type { QrToken } from "../../domain/traceability/types";
import { AuthorizationError, NotFoundError, ValidationError } from "../../domain/shared/errors";
import { can } from "../../domain/shared/permissions";
import { recordAudit } from "../audit/record";
import type { Session } from "../auth/session";
import { assertInScope, resolveLotHierarchy } from "../identity/scope-check";
import { getLotOrThrow } from "../production/lot";
import { buildLotTraceabilityChain } from "./chain";

/**
 * Random, unguessable, and deliberately NOT a UUID (phase-9 brief §2) — visually and
 * structurally distinct from every internal id in this system, so a public URL can never be
 * mistaken for (or brute-forced into) an internal database identifier. 24 random bytes ->
 * 32 URL-safe characters, ~192 bits of entropy.
 */
function generatePublicToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Fixed token for a seeded demo passport, derived from a caller-supplied label.
 *
 * The demo reset must restore the QR "to the exact starting point" (phase-12 brief §5), and a
 * fresh random token each run silently invalidates any QR the presentation team printed in
 * advance. Only `data/seed` passes a label; every token minted through the UI still comes from
 * `generatePublicToken()` above, so the unguessability property that protects real passports is
 * unchanged. The digest keeps the demo token the same shape (32 URL-safe chars, not a UUID) as
 * a real one, so nothing about the public page behaves differently.
 */
export function demoPublicToken(label: string): string {
  return createHash("sha256").update(`biovolailles-demo-passport:${label}`).digest("base64url").slice(0, 32);
}

/**
 * The only place a `qr_tokens` row is created for a LOT. Every token — LOT- or PRODUCT-scoped
 * — always carries the origin lot's id (see DrizzleQrTokenRepository.listByLot's doc comment),
 * which is what lets revocation and the Lot page's "QR / Passeport" section scope-check and
 * list both kinds uniformly.
 */
export async function createLotQrToken(
  lotId: string,
  session: Session,
  expiresAt?: string | null,
  /** Seed-only: pins the token so a demo reset reproduces the same public URL. */
  presetToken?: string
): Promise<QrToken> {
  if (!can(session, "CREATE", "TRACEABILITY")) {
    throw new AuthorizationError("Vous n'avez pas les droits pour générer un passeport public.");
  }
  await getLotOrThrow(lotId);
  assertInScope(session, await resolveLotHierarchy(lotId));

  const token = await repositories.qrTokens.create({
    token: presetToken ?? generatePublicToken(),
    scope: "LOT",
    lotId,
    productId: null,
    active: true,
    expiresAt: expiresAt ?? null,
  });

  await recordAudit({
    actorId: session.userId,
    entityType: "qr_token",
    entityId: token.id,
    field: null,
    oldValue: null,
    newValue: "LOT",
    reason: "Génération d'un passeport public de lot",
    relatedLotId: lotId,
    relatedEventId: null,
  });

  return token;
}

/**
 * A product only gets a public passport through a lot the caller can already see — `originLotId`
 * is the lot whose traceability chain the UI resolved the product from, and is re-verified here
 * (both for scope, and defensively: the product must actually appear in that lot's own chain).
 */
export async function createProductQrToken(
  productId: string,
  originLotId: string,
  session: Session,
  expiresAt?: string | null,
  /** Seed-only: pins the token so a demo reset reproduces the same public URL. */
  presetToken?: string
): Promise<QrToken> {
  if (!can(session, "CREATE", "TRACEABILITY")) {
    throw new AuthorizationError("Vous n'avez pas les droits pour générer un passeport public.");
  }
  assertInScope(session, await resolveLotHierarchy(originLotId));

  const product = await repositories.products.findById(productId);
  if (!product) throw new NotFoundError("Product", productId);

  const chain = await buildLotTraceabilityChain(originLotId, session);
  const belongsToChain = chain.nodes.some((n) => n.type === "PRODUCT" && n.id === productId);
  if (!belongsToChain) {
    throw new ValidationError("Ce produit ne fait pas partie de la chaîne de traçabilité de ce lot.");
  }

  const token = await repositories.qrTokens.create({
    token: presetToken ?? generatePublicToken(),
    scope: "PRODUCT",
    lotId: originLotId,
    productId,
    active: true,
    expiresAt: expiresAt ?? null,
  });

  await recordAudit({
    actorId: session.userId,
    entityType: "qr_token",
    entityId: token.id,
    field: null,
    oldValue: null,
    newValue: `PRODUCT:${product.code}`,
    reason: "Génération d'un passeport public produit",
    relatedLotId: originLotId,
    relatedEventId: null,
  });

  return token;
}

export async function listQrTokensForLot(lotId: string, session: Session): Promise<QrToken[]> {
  if (!can(session, "VIEW", "TRACEABILITY")) {
    throw new AuthorizationError("Vous n'avez pas les droits pour consulter les passeports publics.");
  }
  assertInScope(session, await resolveLotHierarchy(lotId));
  return repositories.qrTokens.listByLot(lotId);
}

/** Revocation is permanent-in-intent (no "un-revoke" action is exposed) — the same posture as deactivating a user. */
export async function revokeQrToken(tokenId: string, session: Session): Promise<QrToken> {
  if (!can(session, "EDIT", "TRACEABILITY")) {
    throw new AuthorizationError("Vous n'avez pas les droits pour révoquer un passeport public.");
  }
  const token = await repositories.qrTokens.findById(tokenId);
  if (!token) throw new NotFoundError("QrToken", tokenId);
  if (!token.lotId) throw new ValidationError("Ce jeton n'est rattaché à aucun lot.");
  assertInScope(session, await resolveLotHierarchy(token.lotId));

  if (!token.active) return token;
  const updated = await repositories.qrTokens.setActive(tokenId, false);

  await recordAudit({
    actorId: session.userId,
    entityType: "qr_token",
    entityId: tokenId,
    field: "active",
    oldValue: "true",
    newValue: "false",
    reason: "Révocation du passeport public",
    relatedLotId: token.lotId,
    relatedEventId: null,
  });

  return updated;
}
