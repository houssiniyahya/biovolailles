import { eq } from "drizzle-orm";
import type { RuleRepository } from "../../domain/intelligence/repositories";
import type { NewRule, Rule } from "../../domain/intelligence/types";
import { db } from "../db/client";
import { rules } from "../db/schema";

export class DrizzleRuleRepository implements RuleRepository {
  async findById(id: string): Promise<Rule | null> {
    const row = await db.query.rules.findFirst({ where: eq(rules.id, id) });
    return (row as Rule | undefined) ?? null;
  }

  async findByName(name: string): Promise<Rule | null> {
    const row = await db.query.rules.findFirst({ where: eq(rules.name, name) });
    return (row as Rule | undefined) ?? null;
  }

  async list(): Promise<Rule[]> {
    const rows = await db.query.rules.findMany({ orderBy: (t, { asc }) => asc(t.name) });
    return rows as Rule[];
  }

  async create(input: NewRule): Promise<Rule> {
    const [row] = await db.insert(rules).values(input).returning();
    return row as Rule;
  }
}
