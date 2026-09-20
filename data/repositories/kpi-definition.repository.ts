import { eq } from "drizzle-orm";
import type { KpiDefinitionRepository } from "../../domain/intelligence/repositories";
import type { KpiDefinition, NewKpiDefinition } from "../../domain/intelligence/types";
import { db } from "../db/client";
import { kpiDefinitions } from "../db/schema";

export class DrizzleKpiDefinitionRepository implements KpiDefinitionRepository {
  async findByCode(code: string): Promise<KpiDefinition | null> {
    const row = await db.query.kpiDefinitions.findFirst({ where: eq(kpiDefinitions.code, code) });
    return row ?? null;
  }

  async list(): Promise<KpiDefinition[]> {
    return db.query.kpiDefinitions.findMany({ orderBy: (t, { asc }) => asc(t.code) });
  }

  async create(input: NewKpiDefinition): Promise<KpiDefinition> {
    const [row] = await db.insert(kpiDefinitions).values(input).returning();
    return row;
  }
}
