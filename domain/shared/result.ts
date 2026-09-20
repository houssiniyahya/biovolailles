/**
 * Result pattern for domain/service operations that can fail in an expected way
 * (validation, invariant violation, not found). Reserve thrown exceptions for
 * unexpected failures (see domain/shared/errors.ts).
 */
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

/** Unwraps a Result, throwing if it failed. Use only where failure is truly exceptional. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new Error(typeof result.error === "string" ? result.error : JSON.stringify(result.error));
  }
  return result.value;
}
