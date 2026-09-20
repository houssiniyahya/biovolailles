import { repositories } from "../../data/repositories";
import type { Building, Cooperative, Farm, Organization, Producer } from "../../domain/identity/types";
import { isGlobalScope, type ScopeContext } from "../../domain/shared/scope";
import { buildHierarchyIndex, isWithinScope } from "./scope-check";

export async function listOrganizationsInScope(scope: ScopeContext): Promise<Organization[]> {
  const all = await repositories.organizations.list();
  if (isGlobalScope(scope)) return all;
  const cooperatives = await repositories.cooperatives.list();
  const organizationIds = new Set(
    cooperatives
      .filter((c) => isWithinScope(scope, { organizationId: c.organizationId, cooperativeId: c.id }))
      .map((c) => c.organizationId)
  );
  return all.filter((org) => organizationIds.has(org.id));
}

/**
 * Scoped list reads for the identity hierarchy. The repository-level `list(scope)` methods
 * (data/repositories/*.repository.ts) only filter correctly when the caller's scope sits at
 * that table's own immediate-parent depth; a COOPERATIVE-scoped user listing farms (two hops
 * away) would otherwise fall through to "no filter" and see everything. These functions apply
 * the full hierarchy index instead, so they're correct regardless of scope depth — this is
 * the completion of the deferral noted in data/repositories/scope-filter.ts from Phase 1.
 */

export async function listCooperativesInScope(scope: ScopeContext): Promise<Cooperative[]> {
  const all = await repositories.cooperatives.list();
  if (isGlobalScope(scope)) return all;
  return all.filter((c) => isWithinScope(scope, { organizationId: c.organizationId, cooperativeId: c.id }));
}

export async function listProducersInScope(scope: ScopeContext): Promise<Producer[]> {
  const all = await repositories.producers.list();
  if (isGlobalScope(scope)) return all;
  const index = await buildHierarchyIndex();
  return all.filter((p) => {
    const path = index.producer.get(p.id);
    return path ? isWithinScope(scope, path) : false;
  });
}

export async function listFarmsInScope(scope: ScopeContext): Promise<Farm[]> {
  const all = await repositories.farms.list();
  if (isGlobalScope(scope)) return all;
  const index = await buildHierarchyIndex();
  return all.filter((f) => {
    const path = index.farm.get(f.id);
    return path ? isWithinScope(scope, path) : false;
  });
}

export async function listBuildingsInScope(scope: ScopeContext): Promise<Building[]> {
  const all = await repositories.buildings.list();
  if (isGlobalScope(scope)) return all;
  const index = await buildHierarchyIndex();
  return all.filter((b) => {
    const path = index.building.get(b.id);
    return path ? isWithinScope(scope, path) : false;
  });
}
