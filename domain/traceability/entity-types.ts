/**
 * The node vocabulary the traceability graph currently knows how to resolve (phase-7 brief
 * §1-§2). Deliberately only the entities that exist in this database today — genetics/
 * hatchery/feed-lot nodes are NOT listed here (no such tables exist yet); adding them later
 * is exactly "add a string to this union + a resolver case", never a schema change to the
 * generic `relations` table itself.
 */
export const ENTITY_TYPE = ["LOT", "COLLECTION", "SLAUGHTER_BATCH", "TRANSFORMATION_BATCH", "PRODUCT", "DESTINATION"] as const;
export type EntityType = (typeof ENTITY_TYPE)[number];

export function isEntityType(value: string): value is EntityType {
  return (ENTITY_TYPE as readonly string[]).includes(value);
}
