import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { AuthorizationError, NotFoundError, ValidationError } from "../../domain/shared/errors";
import { createLot } from "../production/lot";
import { createTestSession } from "../production/test-support";
import { createCollection } from "./collection";
import { createProduct } from "./product";
import { createSlaughterBatch } from "./slaughter";
import { createTransformationBatch } from "./transformation";
import { createLotQrToken, createProductQrToken, listQrTokensForLot, revokeQrToken } from "./qr-tokens";

async function seedLot(suffix: string, session: Awaited<ReturnType<typeof createTestSession>>) {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({ cooperativeId: coop.id, name: `Producer ${suffix}`, contactPhone: null, contactEmail: null });
  const farm = await repositories.farms.create({ producerId: producer.id, name: `Farm ${suffix}`, city: "Kénitra", region: "R", geoLat: 34.2, geoLng: -6.5 });
  const building = await repositories.buildings.create({ farmId: farm.id, code: `BAT-${suffix}`, name: "Building", capacity: 5000, zoneType: "ELEVAGE" });
  const lot = await createLot(
    { code: `LOT-${suffix}`, buildingId: building.id, species: "Poulet", breed: "Ross 308", initialPopulation: 1000, plannedStartAt: null, dataStatus: "SIMULATION" },
    session
  );
  return { farm, building, lot };
}

/** Full downstream chain, built through the real Phase-7 services so the product genuinely belongs to the lot's chain. */
async function seedChain(suffix: string, lotId: string, session: Awaited<ReturnType<typeof createTestSession>>) {
  await repositories.weightMeasurements.create({
    lotId,
    occurredAt: "2026-08-01T00:00:00.000Z",
    averageWeight: 2,
    unit: "KG",
    sampleCount: 10,
    sourceType: "MANUEL",
    dataStatus: "SIMULATION",
    sourceId: null,
    actorId: null,
    measurementMethod: "Pesée",
    deviceId: null,
    documentId: null,
    validationStatus: null,
  });
  const collection = await createCollection(
    { code: `COL-${suffix}`, lotId, quantity: 1000, unit: "KG", collectedAt: "2026-08-02T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL", measurementMethod: "Pesée" },
    session
  );
  const slaughter = await createSlaughterBatch(
    { code: `AB-${suffix}`, sourceLotId: lotId, sourceCollectionId: collection.id, quantityIn: 1000, quantityOut: 700, losses: 300, slaughteredAt: "2026-08-03T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL", measurementMethod: "Registre" },
    session
  );
  const transformation = await createTransformationBatch(
    { code: `TR-${suffix}`, upstreamType: "SLAUGHTER_BATCH", upstreamId: slaughter.id, processType: "Découpe", inputQuantity: 700, outputQuantity: 600, losses: 100, rejects: 0, occurredAt: "2026-08-04T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL", measurementMethod: "Bon" },
    session
  );
  const product = await createProduct(
    { code: `PRD-${suffix}`, name: "Poulet découpé", category: "Frais", transformationBatchId: transformation.id, packagingDate: "2026-08-05T00:00:00.000Z", dataStatus: "SIMULATION", sourceType: "MANUEL", measurementMethod: "Étiquette" },
    session
  );
  return { product };
}

describe("createLotQrToken", () => {
  it("mints a random, non-UUID, unguessable token and records an audit entry", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QR1");
    const { lot } = await seedLot("QR1", admin);

    const token = await createLotQrToken(lot.id, admin);

    expect(token.scope).toBe("LOT");
    expect(token.active).toBe(true);
    expect(token.lotId).toBe(lot.id);
    expect(token.productId).toBeNull();
    // Must NOT look like any internal id in this system.
    expect(token.token).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(token.token).not.toBe(lot.id);
    expect(token.token.length).toBeGreaterThanOrEqual(32);

    const audit = await repositories.auditLog.listByEntity("qr_token", token.id);
    expect(audit).toHaveLength(1);
    expect(audit[0].actorId).toBe(admin.userId);
  });

  it("produces a different token every time", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QR2");
    const { lot } = await seedLot("QR2", admin);
    const a = await createLotQrToken(lot.id, admin);
    const b = await createLotQrToken(lot.id, admin);
    expect(a.token).not.toBe(b.token);
  });

  it("rejects a role without TRACEABILITY:CREATE", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QR3");
    const { lot } = await seedLot("QR3", admin);
    const technician = await createTestSession("TECHNICIAN", "FARM", "some-farm", "QR3b");
    const auditor = await createTestSession("AUDITOR", "GLOBAL", null, "QR3c");

    await expect(createLotQrToken(lot.id, technician)).rejects.toThrow(AuthorizationError);
    await expect(createLotQrToken(lot.id, auditor)).rejects.toThrow(AuthorizationError);
  });

  it("rejects a caller whose scope doesn't cover the lot", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QR4");
    const { lot } = await seedLot("QR4", admin);
    const outsider = await createTestSession("FARM_MANAGER", "FARM", "unrelated-farm", "QR4b");
    await expect(createLotQrToken(lot.id, outsider)).rejects.toThrow(AuthorizationError);
  });

  it("rejects a lot that doesn't exist", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QR5");
    await expect(createLotQrToken("no-such-lot", admin)).rejects.toThrow(NotFoundError);
  });
});

describe("createProductQrToken", () => {
  it("mints a PRODUCT-scoped token that still carries its origin lot", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QR6");
    const { lot } = await seedLot("QR6", admin);
    const { product } = await seedChain("QR6", lot.id, admin);

    const token = await createProductQrToken(product.id, lot.id, admin);
    expect(token.scope).toBe("PRODUCT");
    expect(token.productId).toBe(product.id);
    expect(token.lotId).toBe(lot.id);
  });

  it("refuses a product that isn't in the given lot's own chain", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QR7");
    const { lot: lotA } = await seedLot("QR7A", admin);
    const { lot: lotB } = await seedLot("QR7B", admin);
    const { product } = await seedChain("QR7A", lotA.id, admin);

    await expect(createProductQrToken(product.id, lotB.id, admin)).rejects.toThrow(ValidationError);
  });

  it("rejects a product that doesn't exist", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QR8");
    const { lot } = await seedLot("QR8", admin);
    await expect(createProductQrToken("no-such-product", lot.id, admin)).rejects.toThrow(NotFoundError);
  });
});

describe("listQrTokensForLot / revokeQrToken", () => {
  it("lists both LOT- and PRODUCT-scoped tokens for the lot", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QR9");
    const { lot } = await seedLot("QR9", admin);
    const { product } = await seedChain("QR9", lot.id, admin);
    await createLotQrToken(lot.id, admin);
    await createProductQrToken(product.id, lot.id, admin);

    const tokens = await listQrTokensForLot(lot.id, admin);
    expect(tokens).toHaveLength(2);
    expect(tokens.map((t) => t.scope).sort()).toEqual(["LOT", "PRODUCT"]);
  });

  it("revokes a token and records the transition", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QR10");
    const { lot } = await seedLot("QR10", admin);
    const token = await createLotQrToken(lot.id, admin);

    const revoked = await revokeQrToken(token.id, admin);
    expect(revoked.active).toBe(false);

    const audit = await repositories.auditLog.listByEntity("qr_token", token.id);
    const activeEntry = audit.find((e) => e.field === "active");
    expect(activeEntry!.oldValue).toBe("true");
    expect(activeEntry!.newValue).toBe("false");
  });

  it("rejects revocation by a role without TRACEABILITY:EDIT, and by an out-of-scope caller", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QR11");
    const { lot } = await seedLot("QR11", admin);
    const token = await createLotQrToken(lot.id, admin);

    const auditor = await createTestSession("AUDITOR", "GLOBAL", null, "QR11b");
    await expect(revokeQrToken(token.id, auditor)).rejects.toThrow(AuthorizationError);

    const outsider = await createTestSession("FARM_MANAGER", "FARM", "unrelated-farm", "QR11c");
    await expect(revokeQrToken(token.id, outsider)).rejects.toThrow(AuthorizationError);
  });

  it("is idempotent — re-revoking writes no second audit entry", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "QR12");
    const { lot } = await seedLot("QR12", admin);
    const token = await createLotQrToken(lot.id, admin);

    await revokeQrToken(token.id, admin);
    await revokeQrToken(token.id, admin);

    const audit = await repositories.auditLog.listByEntity("qr_token", token.id);
    expect(audit.filter((e) => e.field === "active")).toHaveLength(1);
  });
});
