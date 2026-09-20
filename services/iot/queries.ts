import { repositories } from "../../data/repositories";
import type { Device } from "../../domain/iot/types";
import { isGlobalScope, type ScopeContext } from "../../domain/shared/scope";
import { buildHierarchyIndex, isWithinScope } from "../identity/scope-check";

/** Same reasoning as services/identity/queries.ts and services/production/lot-queries.ts. */
export async function listDevicesInScope(scope: ScopeContext): Promise<Device[]> {
  const all = await repositories.devices.list();
  if (isGlobalScope(scope)) return all;
  const index = await buildHierarchyIndex();
  return all.filter((device) => {
    const path = index.building.get(device.buildingId);
    return path ? isWithinScope(scope, path) : false;
  });
}
