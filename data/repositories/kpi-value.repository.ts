import { eq } from "drizzle-orm";
import type { KpiValueRepository } from "../../domain/intelligence/repositories";
import type { KpiValue, NewKpiValue } from "../../domain/intelligence/types";
import { db } from "../db/client";
import { kpiValues } from "../db/schema";

export class DrizzleKpiValueRepository implements KpiValueRepository {
  async listByLot(lotId: string): Promise<KpiValue[]> {
    const rows = await db.query.kpiValues.findMany({
      where: eq(kpiValues.lotId, lotId),
      orderBy: (t, { desc }) => desc(t.calculatedAt),
    });
    return rows as KpiValue[];
  }

  async create(input: NewKpiValue): Promise<KpiValue> {
    const [row] = await db.insert(kpiValues).values(input).returning();
    return row as KpiValue;
  }
}
