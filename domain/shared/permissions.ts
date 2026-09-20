import type { Role, ScopeType } from "./enums";

export const MODULE = [
  "ORGANIZATIONS",
  "COOPERATIVES",
  "PRODUCERS",
  "FARMS",
  "BUILDINGS",
  "LOTS",
  "IOT",
  "ANOMALIES",
  "ALERTS",
  "ACTIONS",
  "EVENTS",
  "PRODUCTS",
  "SANITARY",
  "TRACEABILITY",
  "AUDIT",
  "INTEGRITY",
  "USERS",
  "SETTINGS",
] as const;
export type Module = (typeof MODULE)[number];

export const ACTION = ["VIEW", "CREATE", "EDIT", "DELETE", "VALIDATE", "ACKNOWLEDGE", "EXPORT"] as const;
export type Action = (typeof ACTION)[number];

/** Minimal shape `can()` needs — satisfied by services/auth's Session, but kept decoupled from it. */
export interface PermissionSubject {
  role: Role;
  scopeType: ScopeType;
  scopeId: string | null;
}

const ALL_ACTIONS = ACTION;
const READ_ONLY = ["VIEW"] as const;

/**
 * Central permission matrix. This is the ONLY place role -> allowed-action mappings live.
 * Never scatter `if (role === ...)` checks elsewhere — extend this table instead.
 */
const PERMISSIONS: Record<Role, Partial<Record<Module, readonly Action[]>>> = {
  SUPER_ADMIN: Object.fromEntries(MODULE.map((m) => [m, ALL_ACTIONS])) as unknown as Record<
    Module,
    readonly Action[]
  >,

  COOP_MANAGER: {
    ORGANIZATIONS: READ_ONLY,
    COOPERATIVES: ["VIEW", "EDIT"],
    PRODUCERS: ["VIEW", "CREATE", "EDIT"],
    FARMS: ["VIEW", "CREATE", "EDIT"],
    BUILDINGS: ["VIEW", "CREATE", "EDIT"],
    LOTS: ["VIEW", "CREATE", "EDIT"],
    IOT: READ_ONLY,
    ANOMALIES: READ_ONLY,
    ALERTS: ["VIEW", "ACKNOWLEDGE"],
    ACTIONS: ["VIEW", "CREATE"],
    EVENTS: ["VIEW", "CREATE"],
    PRODUCTS: READ_ONLY,
    SANITARY: READ_ONLY,
    TRACEABILITY: ["VIEW", "CREATE", "EDIT"],
  },

  PRODUCER: {
    FARMS: ["VIEW", "EDIT"],
    BUILDINGS: ["VIEW", "EDIT"],
    LOTS: ["VIEW", "CREATE", "EDIT"],
    IOT: READ_ONLY,
    ANOMALIES: READ_ONLY,
    ALERTS: ["VIEW", "ACKNOWLEDGE"],
    ACTIONS: ["VIEW", "CREATE"],
    EVENTS: ["VIEW", "CREATE"],
    PRODUCTS: READ_ONLY,
    SANITARY: READ_ONLY,
    TRACEABILITY: ["VIEW", "CREATE", "EDIT"],
  },

  FARM_MANAGER: {
    FARMS: READ_ONLY,
    BUILDINGS: ["VIEW", "EDIT"],
    LOTS: ["VIEW", "CREATE", "EDIT"],
    IOT: ["VIEW", "EDIT"],
    ANOMALIES: READ_ONLY,
    ALERTS: ["VIEW", "ACKNOWLEDGE"],
    ACTIONS: ["VIEW", "CREATE"],
    EVENTS: ["VIEW", "CREATE"],
    SANITARY: ["VIEW", "CREATE"],
    TRACEABILITY: ["VIEW", "CREATE", "EDIT"],
  },

  TECHNICIAN: {
    BUILDINGS: READ_ONLY,
    LOTS: ["VIEW", "EDIT"],
    IOT: ["VIEW", "EDIT"],
    ANOMALIES: ["VIEW", "VALIDATE"],
    ALERTS: ["VIEW", "ACKNOWLEDGE"],
    ACTIONS: ["VIEW", "CREATE"],
    EVENTS: ["VIEW", "CREATE"],
    SANITARY: ["VIEW", "CREATE", "VALIDATE"],
    TRACEABILITY: READ_ONLY,
  },

  AUDITOR: {
    ORGANIZATIONS: READ_ONLY,
    COOPERATIVES: READ_ONLY,
    PRODUCERS: READ_ONLY,
    FARMS: READ_ONLY,
    BUILDINGS: READ_ONLY,
    LOTS: READ_ONLY,
    IOT: READ_ONLY,
    ANOMALIES: READ_ONLY,
    ALERTS: READ_ONLY,
    ACTIONS: READ_ONLY,
    EVENTS: READ_ONLY,
    PRODUCTS: READ_ONLY,
    SANITARY: READ_ONLY,
    TRACEABILITY: READ_ONLY,
    AUDIT: ["VIEW", "EXPORT"],
    INTEGRITY: ["VIEW", "EXPORT"],
  },
};

/** Returns whether `subject` may perform `action` on `module`. This is the single choke point for authorization checks. */
export function can(subject: PermissionSubject | null | undefined, action: Action, module: Module): boolean {
  if (!subject) return false;
  const allowed = PERMISSIONS[subject.role]?.[module];
  return allowed?.includes(action) ?? false;
}

/** Convenience for nav/route visibility: does this role have any access at all to this module? */
export function canAccessModule(subject: PermissionSubject | null | undefined, module: Module): boolean {
  if (!subject) return false;
  const allowed = PERMISSIONS[subject.role]?.[module];
  return !!allowed && allowed.length > 0;
}

/** Modules visible in navigation for a role, in matrix declaration order. */
export function visibleModules(subject: PermissionSubject | null | undefined): Module[] {
  if (!subject) return [];
  return MODULE.filter((m) => canAccessModule(subject, m));
}
