import { describe, expect, it } from "vitest";
import { repositories } from "../../data/repositories";
import { AuthorizationError, ConflictError, ValidationError } from "../../domain/shared/errors";
import { createTestSession } from "../production/test-support";
import { createUser, setUserActive, updateUserRole, updateUserScope } from "./user-management";

async function seedFarm(suffix: string) {
  const org = await repositories.organizations.create({ name: `Org ${suffix}`, type: "COOPERATIVE" });
  const coop = await repositories.cooperatives.create({ organizationId: org.id, name: `Coop ${suffix}`, region: "R" });
  const producer = await repositories.producers.create({ cooperativeId: coop.id, name: `Producer ${suffix}`, contactPhone: null, contactEmail: null });
  const farm = await repositories.farms.create({ producerId: producer.id, name: `Farm ${suffix}`, city: "City", region: "R", geoLat: null, geoLng: null });
  return farm;
}

const validInput = (email: string) => ({
  email,
  fullName: "Test User",
  role: "TECHNICIAN" as const,
  scopeType: "GLOBAL" as const,
  scopeId: null,
  password: "Password123",
});

describe("createUser", () => {
  it("SUPER_ADMIN can create a user and an audit entry is recorded", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "U1");
    const user = await createUser(validInput("new.user.u1@test.local"), admin);
    expect(user.role).toBe("TECHNICIAN");
    expect(user.active).toBe(true);

    const audit = await repositories.auditLog.listByEntity("user", user.id);
    expect(audit.length).toBeGreaterThanOrEqual(1);
    expect(audit[0].actorId).toBe(admin.userId);
  });

  it("rejects a non-SUPER_ADMIN caller", async () => {
    const coopManager = await createTestSession("COOP_MANAGER", "GLOBAL", null, "U2");
    await expect(createUser(validInput("new.user.u2@test.local"), coopManager)).rejects.toThrow(AuthorizationError);
  });

  it("rejects a duplicate email", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "U3");
    await createUser(validInput("dup.u3@test.local"), admin);
    await expect(createUser(validInput("dup.u3@test.local"), admin)).rejects.toThrow(ConflictError);
  });

  it("rejects a scope target that doesn't exist", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "U4");
    await expect(
      createUser({ ...validInput("bad.scope.u4@test.local"), scopeType: "FARM", scopeId: "no-such-farm" }, admin)
    ).rejects.toThrow(ValidationError);
  });

  it("accepts a real scope target", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "U5");
    const farm = await seedFarm("U5");
    const user = await createUser({ ...validInput("real.scope.u5@test.local"), scopeType: "FARM", scopeId: farm.id }, admin);
    expect(user.scopeId).toBe(farm.id);
  });
});

describe("updateUserRole", () => {
  it("changes the role and records a granular audit entry with old/new values", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "U6");
    const target = await createUser(validInput("role.change.u6@test.local"), admin);

    const updated = await updateUserRole(target.id, "FARM_MANAGER", admin, "Promotion");
    expect(updated.role).toBe("FARM_MANAGER");

    const audit = await repositories.auditLog.listByEntity("user", target.id);
    const roleEntry = audit.find((e) => e.field === "role");
    expect(roleEntry).toBeDefined();
    expect(roleEntry!.oldValue).toBe("TECHNICIAN");
    expect(roleEntry!.newValue).toBe("FARM_MANAGER");
    expect(roleEntry!.reason).toBe("Promotion");
  });

  it("is a no-op (no audit entry) when the role doesn't actually change", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "U7");
    const target = await createUser(validInput("role.noop.u7@test.local"), admin);
    await updateUserRole(target.id, "TECHNICIAN", admin);
    const audit = await repositories.auditLog.listByEntity("user", target.id);
    expect(audit.some((e) => e.field === "role")).toBe(false);
  });

  it("rejects a non-SUPER_ADMIN caller", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "U8");
    const target = await createUser(validInput("role.deny.u8@test.local"), admin);
    const technician = await createTestSession("TECHNICIAN", "FARM", "some-farm", "U8b");
    await expect(updateUserRole(target.id, "FARM_MANAGER", technician)).rejects.toThrow(AuthorizationError);
  });
});

describe("updateUserScope", () => {
  it("changes the scope and records old/new as JSON", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "U9");
    const target = await createUser(validInput("scope.change.u9@test.local"), admin);
    const farm = await seedFarm("U9");

    const updated = await updateUserScope(target.id, "FARM", farm.id, admin, "Reassignment");
    expect(updated.scopeType).toBe("FARM");
    expect(updated.scopeId).toBe(farm.id);

    const audit = await repositories.auditLog.listByEntity("user", target.id);
    const scopeEntry = audit.find((e) => e.field === "scope");
    expect(scopeEntry).toBeDefined();
    expect(JSON.parse(scopeEntry!.newValue!)).toEqual({ scopeType: "FARM", scopeId: farm.id });
  });

  it("rejects an invalid scope target", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "U10");
    const target = await createUser(validInput("scope.invalid.u10@test.local"), admin);
    await expect(updateUserScope(target.id, "FARM", "no-such-farm", admin)).rejects.toThrow(ValidationError);
  });
});

describe("setUserActive", () => {
  it("deactivates a user and records the transition", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "U11");
    const target = await createUser(validInput("deactivate.u11@test.local"), admin);

    const updated = await setUserActive(target.id, false, admin, "Départ");
    expect(updated.active).toBe(false);

    const audit = await repositories.auditLog.listByEntity("user", target.id);
    const activeEntry = audit.find((e) => e.field === "active");
    expect(activeEntry!.oldValue).toBe("true");
    expect(activeEntry!.newValue).toBe("false");
  });

  it("refuses to let a user deactivate their own account", async () => {
    const admin = await createTestSession("SUPER_ADMIN", "GLOBAL", null, "U12");
    await expect(setUserActive(admin.userId, false, admin)).rejects.toThrow(ConflictError);
  });
});
