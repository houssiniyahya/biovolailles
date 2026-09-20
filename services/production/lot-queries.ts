import { repositories } from "../../data/repositories";
import type { Lot } from "../../domain/production/types";
import { isGlobalScope, type ScopeContext } from "../../domain/shared/scope";
import { buildHierarchyIndex, isWithinScope } from "../identity/scope-check";

/** Same reasoning as services/identity/queries.ts — Lot is two hops below Building, so it needs the full index too. */
export async function listLotsInScope(scope: ScopeContext): Promise<Lot[]> {
  const all = await repositories.lots.list();
  if (isGlobalScope(scope)) return all;
  const index = await buildHierarchyIndex();
  return all.filter((lot) => {
    const path = index.building.get(lot.buildingId);
    return path ? isWithinScope(scope, path) : false;
  });
}

export interface LotWithContext extends Lot {
  buildingCode: string;
  farmId: string;
  farmName: string;
}

/** Lots joined with their building/farm names for list-page display and farm filtering. */
export async function listLotsWithContext(scope: ScopeContext): Promise<LotWithContext[]> {
  const [lots, buildings, farms] = await Promise.all([
    listLotsInScope(scope),
    repositories.buildings.list(),
    repositories.farms.list(),
  ]);
  const buildingById = new Map(buildings.map((b) => [b.id, b]));
  const farmById = new Map(farms.map((f) => [f.id, f]));

  return lots.map((lot) => {
    const building = buildingById.get(lot.buildingId);
    const farm = building ? farmById.get(building.farmId) : undefined;
    return {
      ...lot,
      buildingCode: building?.code ?? "—",
      farmId: farm?.id ?? "",
      farmName: farm?.name ?? "—",
    };
  });
}
