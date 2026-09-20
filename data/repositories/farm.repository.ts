import { eq } from "drizzle-orm";
import type { FarmRepository } from "../../domain/identity/repositories";
import type { Farm, NewFarm } from "../../domain/identity/types";
import { NotFoundError } from "../../domain/shared/errors";
import { GLOBAL_SCOPE, type ScopeContext } from "../../domain/shared/scope";
import { db } from "../db/client";
import { farms } from "../db/schema";
import { scopeCondition } from "./scope-filter";

export class DrizzleFarmRepository implements FarmRepository {
  async findById(id: string): Promise<Farm | null> {
    const row = await db.query.farms.findFirst({ where: eq(farms.id, id) });
    return row ?? null;
  }

  async listByProducer(producerId: string): Promise<Farm[]> {
    return db.query.farms.findMany({
      where: eq(farms.producerId, producerId),
      orderBy: (t, { asc }) => asc(t.name),
    });
  }

  async list(scope: ScopeContext = GLOBAL_SCOPE): Promise<Farm[]> {
    return db.query.farms.findMany({
      where: scopeCondition(scope, farms.producerId, "PRODUCER"),
      orderBy: (t, { asc }) => asc(t.name),
    });
  }

  async create(input: NewFarm): Promise<Farm> {
    const [row] = await db.insert(farms).values(input).returning();
    return row;
  }

  async update(id: string, patch: Partial<NewFarm>): Promise<Farm> {
    const [row] = await db.update(farms).set(patch).where(eq(farms.id, id)).returning();
    if (!row) throw new NotFoundError("Farm", id);
    return row;
  }
}
