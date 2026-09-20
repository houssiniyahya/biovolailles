import { eq, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { isGlobalScope, type ScopeContext } from "../../domain/shared/scope";
import type { ScopeType } from "../../domain/shared/enums";

/**
 * Single place the "WHERE <hierarchy column> = scope.scopeId" pattern lives.
 * Repositories call this instead of writing the condition inline, so scope logic
 * is never duplicated across queries (see ARCHITECTURE.md §8, phase-1 brief §9).
 *
 * `column` must be the FK on the queried table that holds the id at `matchesLevel`'s
 * hierarchy depth. Returns undefined (no filter) when the scope is GLOBAL or sits
 * at a different depth than this table's own level — scoping across a join (e.g. a
 * COOPERATIVE-scoped user listing farms, which requires walking through producers)
 * is added per-repository as those queries are built in later phases.
 */
export function scopeCondition(
  scope: ScopeContext,
  column: SQLiteColumn,
  matchesLevel: ScopeType
): SQL | undefined {
  if (isGlobalScope(scope)) return undefined;
  if (scope.scopeType !== matchesLevel || !scope.scopeId) return undefined;
  return eq(column, scope.scopeId);
}
