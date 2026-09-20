/**
 * Central error taxonomy. Server Actions/services throw these; the UI layer
 * (or a shared handler) turns them into safe messages via toPublicError.
 * Never let a raw driver/database error reach the client.
 */
export type AppErrorKind =
  | "VALIDATION"
  | "AUTHORIZATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DATABASE"
  | "UNEXPECTED";

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly cause?: unknown;

  constructor(kind: AppErrorKind, message: string, cause?: unknown) {
    super(message);
    this.name = "AppError";
    this.kind = kind;
    this.cause = cause;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("VALIDATION", message, cause);
    this.name = "ValidationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Vous n'avez pas les droits requis pour cette action.") {
    super("AUTHORIZATION", message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super("NOT_FOUND", `${entity} introuvable (${id}).`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message);
    this.name = "ConflictError";
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, cause?: unknown) {
    super("DATABASE", message, cause);
    this.name = "DatabaseError";
  }
}

const SAFE_MESSAGE_BY_KIND: Record<AppErrorKind, string> = {
  VALIDATION: "Les données saisies sont invalides.",
  AUTHORIZATION: "Vous n'avez pas les droits requis pour cette action.",
  NOT_FOUND: "Ressource introuvable.",
  CONFLICT: "Cette action entre en conflit avec l'état actuel des données.",
  DATABASE: "Une erreur technique est survenue. Réessayez plus tard.",
  UNEXPECTED: "Une erreur inattendue est survenue. Réessayez plus tard.",
};

export interface PublicError {
  kind: AppErrorKind;
  message: string;
}

/**
 * Converts any thrown value into a safe, user-facing shape.
 * AppError subclasses keep their own message (already written to be user-safe).
 * Anything else (driver errors, TypeErrors, etc.) is collapsed to a generic message
 * — the real error still belongs in the server log, not in the response.
 */
export function toPublicError(error: unknown): PublicError {
  if (error instanceof AppError) {
    return { kind: error.kind, message: error.message };
  }
  return { kind: "UNEXPECTED", message: SAFE_MESSAGE_BY_KIND.UNEXPECTED };
}
