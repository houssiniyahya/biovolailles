import { desc, eq } from "drizzle-orm";
import type { QrTokenRepository } from "../../domain/traceability/repositories";
import type { NewQrToken, QrToken } from "../../domain/traceability/types";
import { db } from "../db/client";
import { qrTokens } from "../db/schema";

export class DrizzleQrTokenRepository implements QrTokenRepository {
  async findById(id: string): Promise<QrToken | null> {
    const row = await db.query.qrTokens.findFirst({ where: eq(qrTokens.id, id) });
    return row ?? null;
  }

  async findByToken(token: string): Promise<QrToken | null> {
    const row = await db.query.qrTokens.findFirst({ where: eq(qrTokens.token, token) });
    return row ?? null;
  }

  /** Includes PRODUCT-scoped tokens too — every token stores the lot it traces back to, not just LOT-scoped ones (see services/traceability/qr-tokens.ts). */
  async listByLot(lotId: string): Promise<QrToken[]> {
    return db.query.qrTokens.findMany({ where: eq(qrTokens.lotId, lotId), orderBy: desc(qrTokens.createdAt) });
  }

  async listByProduct(productId: string): Promise<QrToken[]> {
    return db.query.qrTokens.findMany({ where: eq(qrTokens.productId, productId), orderBy: desc(qrTokens.createdAt) });
  }

  async create(input: NewQrToken): Promise<QrToken> {
    const [row] = await db.insert(qrTokens).values(input).returning();
    return row;
  }

  async setActive(id: string, active: boolean): Promise<QrToken> {
    const [row] = await db.update(qrTokens).set({ active }).where(eq(qrTokens.id, id)).returning();
    return row;
  }
}
