import type { ScopeContext } from "../../domain/shared/scope";
import { listLotsInScope } from "../production/lot-queries";
import { listBuildingsInScope, listCooperativesInScope, listFarmsInScope, listProducersInScope } from "./queries";

export interface HierarchyCounts {
  cooperatives: number;
  producers: number;
  farms: number;
  buildings: number;
  totalLots: number;
  activeLots: number;
}

/** Exactly one of these is expected to be set — "roll up counts under this one record". */
export interface RollupFilter {
  organizationId?: string;
  cooperativeId?: string;
  producerId?: string;
  farmId?: string;
}

/**
 * Shared by the organization/cooperative/producer/farm detail pages so each doesn't
 * re-derive its own descendant counts. Always builds off the caller's already-scoped
 * lists (services/identity/queries.ts, services/production/lot-queries.ts), then narrows
 * further by the one hierarchy id being viewed.
 */
export async function computeHierarchyCounts(scope: ScopeContext, filter: RollupFilter): Promise<HierarchyCounts> {
  const [allCooperatives, allProducers, allFarms, allBuildings, allLots] = await Promise.all([
    listCooperativesInScope(scope),
    listProducersInScope(scope),
    listFarmsInScope(scope),
    listBuildingsInScope(scope),
    listLotsInScope(scope),
  ]);

  let cooperatives = allCooperatives;
  if (filter.organizationId) cooperatives = cooperatives.filter((c) => c.organizationId === filter.organizationId);
  const cooperativeIds = new Set(cooperatives.map((c) => c.id));

  let producers = allProducers;
  if (filter.cooperativeId) producers = producers.filter((p) => p.cooperativeId === filter.cooperativeId);
  else if (filter.organizationId) producers = producers.filter((p) => cooperativeIds.has(p.cooperativeId));
  const producerIds = new Set(producers.map((p) => p.id));

  let farms = allFarms;
  if (filter.producerId) farms = farms.filter((f) => f.producerId === filter.producerId);
  else if (filter.cooperativeId || filter.organizationId) farms = farms.filter((f) => producerIds.has(f.producerId));
  const farmIds = new Set(farms.map((f) => f.id));

  let buildings = allBuildings;
  if (filter.farmId) buildings = buildings.filter((b) => b.farmId === filter.farmId);
  else if (filter.producerId || filter.cooperativeId || filter.organizationId) {
    buildings = buildings.filter((b) => farmIds.has(b.farmId));
  }
  const buildingIds = new Set(buildings.map((b) => b.id));

  const hasFilter = Boolean(filter.organizationId || filter.cooperativeId || filter.producerId || filter.farmId);
  const lots = hasFilter ? allLots.filter((lot) => buildingIds.has(lot.buildingId)) : allLots;

  return {
    cooperatives: cooperatives.length,
    producers: producers.length,
    farms: farms.length,
    buildings: buildings.length,
    totalLots: lots.length,
    activeLots: lots.filter((lot) => lot.status === "ACTIF").length,
  };
}
