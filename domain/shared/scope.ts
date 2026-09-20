import type { ScopeType } from "./enums";

/** A user's data-visibility boundary — carried on the session, checked by repositories. */
export interface ScopeContext {
  scopeType: ScopeType;
  scopeId: string | null;
}

export const GLOBAL_SCOPE: ScopeContext = { scopeType: "GLOBAL", scopeId: null };

export function isGlobalScope(scope: ScopeContext): boolean {
  return scope.scopeType === "GLOBAL";
}
