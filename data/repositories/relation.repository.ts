import { and, eq } from "drizzle-orm";
import type { RelationRepository } from "../../domain/traceability/repositories";
import type { NewRelation, Relation } from "../../domain/traceability/types";
import { db } from "../db/client";
import { relations as relationsTable } from "../db/schema";

export class DrizzleRelationRepository implements RelationRepository {
  async listFrom(fromType: string, fromId: string): Promise<Relation[]> {
    const rows = await db.query.relations.findMany({
      where: and(eq(relationsTable.fromType, fromType), eq(relationsTable.fromId, fromId)),
    });
    return rows as Relation[];
  }

  async listTo(toType: string, toId: string): Promise<Relation[]> {
    const rows = await db.query.relations.findMany({
      where: and(eq(relationsTable.toType, toType), eq(relationsTable.toId, toId)),
    });
    return rows as Relation[];
  }

  async findExact(fromType: string, fromId: string, relationType: string, toType: string, toId: string): Promise<Relation | null> {
    const row = await db.query.relations.findFirst({
      where: and(
        eq(relationsTable.fromType, fromType),
        eq(relationsTable.fromId, fromId),
        eq(relationsTable.relationType, relationType as Relation["relationType"]),
        eq(relationsTable.toType, toType),
        eq(relationsTable.toId, toId)
      ),
    });
    return (row as Relation | undefined) ?? null;
  }

  async create(input: NewRelation): Promise<Relation> {
    const [row] = await db.insert(relationsTable).values(input).returning();
    return row as Relation;
  }
}
