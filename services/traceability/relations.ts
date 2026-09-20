import { repositories } from "../../data/repositories";
import type { EntityType } from "../../domain/traceability/entity-types";
import { isRelationAllowed } from "../../domain/traceability/relation-rules";
import type { Relation } from "../../domain/traceability/types";
import type { RelationType } from "../../domain/shared/enums";
import { NotFoundError, ValidationError } from "../../domain/shared/errors";
import { recordAudit } from "../audit/record";
import { entityExists } from "./entity-resolver";

export interface CreateRelationInput {
  fromType: EntityType;
  fromId: string;
  relationType: RelationType;
  toType: EntityType;
  toId: string;
  metadata?: Record<string, unknown>;
  /** Who caused this edge to be created — attributed on the audit entry. Callers that don't carry a session (e.g. seed scripts) may omit it. */
  actorId?: string | null;
}

/**
 * The ONLY place a `relations` row is created (phase-7 brief §2: "the UI must never
 * directly create raw relation rows"). Every structured entity-creation service
 * (createCollection, createSlaughterBatch, createTransformationBatch, createProduct) calls
 * this internally right after persisting its own row — nothing else creates relations, and
 * this function is never wired to a public Server Action taking arbitrary fromType/toType.
 *
 * Verifies, in order: the relation type is allowed between these two entity types, both
 * endpoints actually exist, then de-duplicates — an identical edge that already exists is
 * returned as-is rather than inserted again or rejected.
 */
export async function createRelation(input: CreateRelationInput): Promise<Relation> {
  if (!isRelationAllowed(input.relationType, input.fromType, input.toType)) {
    throw new ValidationError(
      `La relation "${input.relationType}" n'est pas autorisée entre ${input.fromType} et ${input.toType}.`
    );
  }

  const [fromExists, toExists] = await Promise.all([
    entityExists(input.fromType, input.fromId),
    entityExists(input.toType, input.toId),
  ]);
  if (!fromExists) throw new NotFoundError(input.fromType, input.fromId);
  if (!toExists) throw new NotFoundError(input.toType, input.toId);

  const existing = await repositories.relations.findExact(
    input.fromType,
    input.fromId,
    input.relationType,
    input.toType,
    input.toId
  );
  if (existing) return existing;

  const relation = await repositories.relations.create({
    fromType: input.fromType,
    fromId: input.fromId,
    relationType: input.relationType,
    toType: input.toType,
    toId: input.toId,
    metadata: input.metadata ?? {},
  });

  await recordAudit({
    actorId: input.actorId ?? null,
    entityType: "relation",
    entityId: relation.id,
    field: null,
    oldValue: null,
    newValue: `${input.fromType}:${input.fromId} --${input.relationType}--> ${input.toType}:${input.toId}`,
    reason: "Création d'une relation de traçabilité",
    relatedLotId: input.fromType === "LOT" ? input.fromId : input.toType === "LOT" ? input.toId : null,
    relatedEventId: null,
  });

  return relation;
}
