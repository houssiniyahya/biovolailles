import { eq } from "drizzle-orm";
import type { ProducerRepository } from "../../domain/identity/repositories";
import type { NewProducer, Producer } from "../../domain/identity/types";
import { NotFoundError } from "../../domain/shared/errors";
import { GLOBAL_SCOPE, type ScopeContext } from "../../domain/shared/scope";
import { db } from "../db/client";
import { producers } from "../db/schema";
import { scopeCondition } from "./scope-filter";

export class DrizzleProducerRepository implements ProducerRepository {
  async findById(id: string): Promise<Producer | null> {
    const row = await db.query.producers.findFirst({ where: eq(producers.id, id) });
    return row ?? null;
  }

  async listByCooperative(cooperativeId: string): Promise<Producer[]> {
    return db.query.producers.findMany({
      where: eq(producers.cooperativeId, cooperativeId),
      orderBy: (t, { asc }) => asc(t.name),
    });
  }

  async list(scope: ScopeContext = GLOBAL_SCOPE): Promise<Producer[]> {
    return db.query.producers.findMany({
      where: scopeCondition(scope, producers.cooperativeId, "COOPERATIVE"),
      orderBy: (t, { asc }) => asc(t.name),
    });
  }

  async create(input: NewProducer): Promise<Producer> {
    const [row] = await db.insert(producers).values(input).returning();
    return row;
  }

  async update(id: string, patch: Partial<NewProducer>): Promise<Producer> {
    const [row] = await db.update(producers).set(patch).where(eq(producers.id, id)).returning();
    if (!row) throw new NotFoundError("Producer", id);
    return row;
  }
}
