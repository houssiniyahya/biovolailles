import { eq } from "drizzle-orm";
import type { OrganizationRepository } from "../../domain/identity/repositories";
import type { NewOrganization, Organization } from "../../domain/identity/types";
import { NotFoundError } from "../../domain/shared/errors";
import { db } from "../db/client";
import { organizations } from "../db/schema";

export class DrizzleOrganizationRepository implements OrganizationRepository {
  async findById(id: string): Promise<Organization | null> {
    const row = await db.query.organizations.findFirst({ where: eq(organizations.id, id) });
    return row ?? null;
  }

  async list(): Promise<Organization[]> {
    return db.query.organizations.findMany({ orderBy: (t, { asc }) => asc(t.name) });
  }

  async create(input: NewOrganization): Promise<Organization> {
    const [row] = await db.insert(organizations).values(input).returning();
    return row;
  }

  async update(id: string, patch: Partial<NewOrganization>): Promise<Organization> {
    const [row] = await db.update(organizations).set(patch).where(eq(organizations.id, id)).returning();
    if (!row) throw new NotFoundError("Organization", id);
    return row;
  }
}
