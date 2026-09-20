import { eq } from "drizzle-orm";
import type { DestinationRepository } from "../../domain/traceability/repositories";
import type { Destination, NewDestination } from "../../domain/traceability/types";
import { db } from "../db/client";
import { destinations } from "../db/schema";

export class DrizzleDestinationRepository implements DestinationRepository {
  async findById(id: string): Promise<Destination | null> {
    const row = await db.query.destinations.findFirst({ where: eq(destinations.id, id) });
    return row ?? null;
  }

  async findByCode(code: string): Promise<Destination | null> {
    const row = await db.query.destinations.findFirst({ where: eq(destinations.code, code) });
    return row ?? null;
  }

  async list(): Promise<Destination[]> {
    return db.query.destinations.findMany({ orderBy: (t, { asc }) => asc(t.name) });
  }

  async create(input: NewDestination): Promise<Destination> {
    const [row] = await db.insert(destinations).values(input).returning();
    return row;
  }
}
