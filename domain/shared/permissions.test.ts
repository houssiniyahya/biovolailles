import { describe, expect, it } from "vitest";
import { canAccessModule, can } from "./permissions";

describe("permissions.can()", () => {
  it("grants SUPER_ADMIN every action on every module", () => {
    const admin = { role: "SUPER_ADMIN" as const, scopeType: "GLOBAL" as const, scopeId: null };
    expect(can(admin, "DELETE", "USERS")).toBe(true);
    expect(can(admin, "VALIDATE", "AUDIT")).toBe(true);
  });

  it("denies AUDITOR any write action", () => {
    const auditor = { role: "AUDITOR" as const, scopeType: "GLOBAL" as const, scopeId: null };
    expect(can(auditor, "VIEW", "LOTS")).toBe(true);
    expect(can(auditor, "CREATE", "LOTS")).toBe(false);
    expect(can(auditor, "EDIT", "LOTS")).toBe(false);
  });

  it("denies TECHNICIAN access to USERS and SETTINGS entirely", () => {
    const technician = { role: "TECHNICIAN" as const, scopeType: "FARM" as const, scopeId: "farm-1" };
    expect(canAccessModule(technician, "USERS")).toBe(false);
    expect(canAccessModule(technician, "SETTINGS")).toBe(false);
    expect(canAccessModule(technician, "LOTS")).toBe(true);
  });

  it("returns false for a null/undefined subject (unauthenticated)", () => {
    expect(can(null, "VIEW", "LOTS")).toBe(false);
    expect(can(undefined, "VIEW", "LOTS")).toBe(false);
  });

  it("grants FARM_MANAGER edit rights on IOT but only view on FARMS", () => {
    const farmManager = { role: "FARM_MANAGER" as const, scopeType: "FARM" as const, scopeId: "farm-1" };
    expect(can(farmManager, "EDIT", "IOT")).toBe(true);
    expect(can(farmManager, "EDIT", "FARMS")).toBe(false);
    expect(can(farmManager, "VIEW", "FARMS")).toBe(true);
  });

  it("grants AUDITOR read-only + export on AUDIT and INTEGRITY, but not EDIT (phase-8)", () => {
    const auditor = { role: "AUDITOR" as const, scopeType: "GLOBAL" as const, scopeId: null };
    expect(can(auditor, "VIEW", "INTEGRITY")).toBe(true);
    expect(can(auditor, "EXPORT", "INTEGRITY")).toBe(true);
    expect(can(auditor, "EXPORT", "AUDIT")).toBe(true);
    expect(can(auditor, "EDIT", "INTEGRITY")).toBe(false);
  });

  it("grants QR passport management (TRACEABILITY create/edit) to the lot-owning roles only (phase-9)", () => {
    const coopManager = { role: "COOP_MANAGER" as const, scopeType: "COOPERATIVE" as const, scopeId: "coop-1" };
    const producer = { role: "PRODUCER" as const, scopeType: "PRODUCER" as const, scopeId: "prod-1" };
    const farmManager = { role: "FARM_MANAGER" as const, scopeType: "FARM" as const, scopeId: "farm-1" };
    for (const subject of [coopManager, producer, farmManager]) {
      expect(can(subject, "CREATE", "TRACEABILITY")).toBe(true);
      expect(can(subject, "EDIT", "TRACEABILITY")).toBe(true);
    }

    // Technician and auditor may read traceability but never mint or revoke a public passport.
    const technician = { role: "TECHNICIAN" as const, scopeType: "FARM" as const, scopeId: "farm-1" };
    const auditor = { role: "AUDITOR" as const, scopeType: "GLOBAL" as const, scopeId: null };
    for (const subject of [technician, auditor]) {
      expect(can(subject, "VIEW", "TRACEABILITY")).toBe(true);
      expect(can(subject, "CREATE", "TRACEABILITY")).toBe(false);
      expect(can(subject, "EDIT", "TRACEABILITY")).toBe(false);
    }
  });

  it("USERS/SETTINGS/INTEGRITY(EDIT) remain SUPER_ADMIN-only", () => {
    const coopManager = { role: "COOP_MANAGER" as const, scopeType: "GLOBAL" as const, scopeId: null };
    expect(canAccessModule(coopManager, "USERS")).toBe(false);
    expect(canAccessModule(coopManager, "SETTINGS")).toBe(false);
    expect(canAccessModule(coopManager, "INTEGRITY")).toBe(false);

    const admin = { role: "SUPER_ADMIN" as const, scopeType: "GLOBAL" as const, scopeId: null };
    expect(can(admin, "EDIT", "USERS")).toBe(true);
    expect(can(admin, "EDIT", "INTEGRITY")).toBe(true);
  });
});
