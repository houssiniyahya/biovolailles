import { repositories } from "../../data/repositories";
import { AuthorizationError, NotFoundError } from "../../domain/shared/errors";
import type { ScopeContext } from "../../domain/shared/scope";
import { isGlobalScope } from "../../domain/shared/scope";

/**
 * Every ancestor id for a record, as far up the identity hierarchy as is known.
 * Not every level fills every field — a Cooperative's path has no farmId/buildingId.
 */
export interface HierarchyPath {
  organizationId?: string;
  cooperativeId?: string;
  producerId?: string;
  farmId?: string;
  buildingId?: string;
}

/**
 * The single place "does this scope cover this record" is decided. Complements
 * data/repositories/scope-filter.ts (which restricts *list* queries) — this is for
 * *single-record* reads/writes, where the answer must be a hard yes/no, not a filter.
 * This is what stops "change the URL to see someone else's record" (phase-2 brief §4).
 */
export function isWithinScope(scope: ScopeContext, path: HierarchyPath): boolean {
  if (isGlobalScope(scope)) return true;
  switch (scope.scopeType) {
    case "ORGANIZATION":
      return path.organizationId === scope.scopeId;
    case "COOPERATIVE":
      return path.cooperativeId === scope.scopeId;
    case "PRODUCER":
      return path.producerId === scope.scopeId;
    case "FARM":
      return path.farmId === scope.scopeId;
    default:
      return false;
  }
}

export function assertInScope(scope: ScopeContext, path: HierarchyPath): void {
  if (!isWithinScope(scope, path)) {
    throw new AuthorizationError("Cette ressource n'appartient pas à votre périmètre.");
  }
}

export async function resolveCooperativeHierarchy(cooperativeId: string): Promise<HierarchyPath> {
  const cooperative = await repositories.cooperatives.findById(cooperativeId);
  if (!cooperative) throw new NotFoundError("Cooperative", cooperativeId);
  return { organizationId: cooperative.organizationId, cooperativeId: cooperative.id };
}

export async function resolveProducerHierarchy(producerId: string): Promise<HierarchyPath> {
  const producer = await repositories.producers.findById(producerId);
  if (!producer) throw new NotFoundError("Producer", producerId);
  const parent = await resolveCooperativeHierarchy(producer.cooperativeId);
  return { ...parent, producerId: producer.id };
}

export async function resolveFarmHierarchy(farmId: string): Promise<HierarchyPath> {
  const farm = await repositories.farms.findById(farmId);
  if (!farm) throw new NotFoundError("Farm", farmId);
  const parent = await resolveProducerHierarchy(farm.producerId);
  return { ...parent, farmId: farm.id };
}

export async function resolveBuildingHierarchy(buildingId: string): Promise<HierarchyPath> {
  const building = await repositories.buildings.findById(buildingId);
  if (!building) throw new NotFoundError("Building", buildingId);
  const parent = await resolveFarmHierarchy(building.farmId);
  return { ...parent, buildingId: building.id };
}

export async function resolveLotHierarchy(lotId: string): Promise<HierarchyPath> {
  const lot = await repositories.lots.findById(lotId);
  if (!lot) throw new NotFoundError("Lot", lotId);
  return resolveBuildingHierarchy(lot.buildingId);
}

/** Bulk-built lookup, keyed by each level's own id. For filtering LIST pages — cheap at MVP scale (a handful of bulk queries, not N+1). */
export interface HierarchyIndex {
  cooperative: Map<string, HierarchyPath>;
  producer: Map<string, HierarchyPath>;
  farm: Map<string, HierarchyPath>;
  building: Map<string, HierarchyPath>;
}

export async function buildHierarchyIndex(): Promise<HierarchyIndex> {
  const [cooperatives, producers, farms, buildings] = await Promise.all([
    repositories.cooperatives.list(),
    repositories.producers.list(),
    repositories.farms.list(),
    repositories.buildings.list(),
  ]);

  const cooperative = new Map<string, HierarchyPath>();
  for (const c of cooperatives) {
    cooperative.set(c.id, { organizationId: c.organizationId, cooperativeId: c.id });
  }

  const producer = new Map<string, HierarchyPath>();
  for (const p of producers) {
    producer.set(p.id, { ...cooperative.get(p.cooperativeId), producerId: p.id });
  }

  const farm = new Map<string, HierarchyPath>();
  for (const f of farms) {
    farm.set(f.id, { ...producer.get(f.producerId), farmId: f.id });
  }

  const building = new Map<string, HierarchyPath>();
  for (const b of buildings) {
    building.set(b.id, { ...farm.get(b.farmId), buildingId: b.id });
  }

  return { cooperative, producer, farm, building };
}
