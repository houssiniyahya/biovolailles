// No `import "server-only"` here — same reasoning as services/auth/session.ts: the guard
// lives on the modules that hold the DB client and secrets, and adding it to a plain service
// only breaks the Vitest module graph.
import { repositories } from "../../data/repositories";
import type { Session } from "../auth/session";
import { SCOPE_TYPE_LABEL } from "../../lib/labels";

export interface ScopeDescriptor {
  /** Short noun for the scope level, e.g. "Ferme". */
  kind: string;
  /** Name of the scoped entity, or a global-view phrase. */
  name: string;
  /** Role-specific qualifier ("lecture seule", "vue technique / IoT") — may be null. */
  qualifier: string | null;
}

/**
 * Who the caller is scoped to, resolved once and reused by both the dashboard heading and
 * the app shell. Previously the dashboard owned a private copy of this logic; the shell had
 * no scope indicator at all, so a user could not tell which farm they were looking at
 * outside the dashboard (§6).
 */
export async function resolveScopeDescriptor(session: Session): Promise<ScopeDescriptor> {
  switch (session.scopeType) {
    case "GLOBAL":
      return {
        kind: "Périmètre",
        name: "Vue globale — toute la plateforme",
        qualifier: session.role === "AUDITOR" ? "lecture seule (audit)" : null,
      };
    case "ORGANIZATION": {
      const organization = session.scopeId ? await repositories.organizations.findById(session.scopeId) : null;
      return { kind: SCOPE_TYPE_LABEL.ORGANIZATION, name: organization?.name ?? "—", qualifier: null };
    }
    case "COOPERATIVE": {
      const cooperative = session.scopeId ? await repositories.cooperatives.findById(session.scopeId) : null;
      return { kind: SCOPE_TYPE_LABEL.COOPERATIVE, name: cooperative?.name ?? "—", qualifier: null };
    }
    case "PRODUCER": {
      const producer = session.scopeId ? await repositories.producers.findById(session.scopeId) : null;
      return { kind: SCOPE_TYPE_LABEL.PRODUCER, name: producer?.name ?? "—", qualifier: null };
    }
    case "FARM": {
      const farm = session.scopeId ? await repositories.farms.findById(session.scopeId) : null;
      return {
        kind: SCOPE_TYPE_LABEL.FARM,
        name: farm?.name ?? "—",
        qualifier: session.role === "TECHNICIAN" ? "vue technique / IoT" : null,
      };
    }
    default:
      return { kind: "Périmètre", name: "—", qualifier: null };
  }
}

/** Single-line form, used as the dashboard subtitle. */
export function formatScopeLabel(scope: ScopeDescriptor): string {
  const base = scope.kind === "Périmètre" ? scope.name : `${scope.kind} : ${scope.name}`;
  return scope.qualifier ? `${base} — ${scope.qualifier}` : base;
}

export async function resolveScopeLabel(session: Session): Promise<string> {
  return formatScopeLabel(await resolveScopeDescriptor(session));
}
