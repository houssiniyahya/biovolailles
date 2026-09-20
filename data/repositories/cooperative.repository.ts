import { eq } from "drizzle-orm";
import type { CooperativeRepository } from "../../domain/identity/repositories";
import type { Cooperative, NewCooperative } from "../../domain/identity/types";
import { NotFoundError } from "../../domain/shared/errors";
import { GLOBAL_SCOPE, type ScopeContext } from "../../domain/shared/scope";
import { db } from "../db/client";
import { cooperatives } from "../db/schema";
import { scopeCondition } from "./scope-filter";

export class DrizzleCooperativeRepository implements CooperativeRepository {
  async findById(id: string): Promise<Cooperative | null> {
    const row = await db.query.cooperatives.findFirst({ where: eq(cooperatives.id, id) });
    return row ?? null;
  }

  async listByOrganization(organizationId: string): Promise<Cooperative[]> {
    return db.query.cooperatives.findMany({
      where: eq(cooperatives.organizationId, organizationId),
      orderBy: (t, { asc }) => asc(t.name),
    });
  }

  async list(scope: ScopeContext = GLOBAL_SCOPE): Promise<Cooperative[]> {
    return db.query.cooperatives.findMany({
      where: scopeCondition(scope, cooperatives.organizationId, "ORGANIZATION"),
      orderBy: (t, { asc }) => asc(t.name),
    });
  }

  async create(input: NewCooperative): Promise<Cooperative> {
    const [row] = await db.insert(cooperatives).values(input).returning();
    return row;
  }

  async update(id: string, patch: Partial<NewCooperative>): Promise<Cooperative> {
    const [row] = await db.update(cooperatives).set(patch).where(eq(cooperatives.id, id)).returning();
    if (!row) throw new NotFoundError("Cooperative", id);
    return row;
  }
}
