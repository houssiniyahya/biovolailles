import { toPublicError, type PublicError } from "../domain/shared/errors";
import { logger, type LogContext } from "./logger";

/**
 * Server Actions call this in their catch block: logs the real error server-side
 * (with full detail) and returns the safe, user-facing shape to send to the client.
 * Never send `error` itself (or error.message from a non-AppError) to the UI.
 */
export function handleActionError(context: LogContext, error: unknown): PublicError {
  const publicError = toPublicError(error);
  if (publicError.kind === "UNEXPECTED" || publicError.kind === "DATABASE") {
    logger.error(context, "Unhandled error", error);
  } else {
    logger.warn(context, publicError.message);
  }
  return publicError;
}
