import { and, eq } from "drizzle-orm";
import type { BuildingRepository } from "../../domain/identity/repositories";
import type { Building, NewBuilding } from "../../domain/identity/types";
import { NotFoundError } from "../../domain/shared/errors";
import { GLOBAL_SCOPE, type ScopeContext } from "../../domain/shared/scope";
import { db } from "../db/client";
import { buildings } from "../db/schema";
import { scopeCondition } from "./scope-filter";

export class DrizzleBuildingRepository implements BuildingRepository {
  async findById(id: string): Promise<Building | null> {
    const row = await db.query.buildings.findFirst({ where: eq(buildings.id, id) });
    return row ?? null;
  }

  /**
   * Always filters by the requested farmId; if the caller's scope is itself FARM-level,
   * that scope is AND-ed in too, so a FARM-scoped user gets an empty result (not someone
   * else's buildings) when asking for a farmId that isn't their own.
   */
  async listByFarm(farmId: string, scope: ScopeContext = GLOBAL_SCOPE): Promise<Building[]> {
    const farmScope = scopeCondition(scope, buildings.farmId, "FARM");
    const where = farmScope ? and(eq(buildings.farmId, farmId), farmScope) : eq(buildings.farmId, farmId);
    return db.query.buildings.findMany({
      where,
      orderBy: (t, { asc }) => asc(t.code),
    });
  }

  async list(): Promise<Building[]> {
    return db.query.buildings.findMany({ orderBy: (t, { asc }) => asc(t.code) });
  }

  async create(input: NewBuilding): Promise<Building> {
    const [row] = await db.insert(buildings).values(input).returning();
    return row;
  }

  async update(id: string, patch: Partial<NewBuilding>): Promise<Building> {
    const [row] = await db.update(buildings).set(patch).where(eq(buildings.id, id)).returning();
    if (!row) throw new NotFoundError("Building", id);
    return row;
  }
}
