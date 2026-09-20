/**
 * Lightweight dev logging — not an observability platform. Enough structure to
 * diagnose db init, auth, repository, and Server Action failures (phase-1 brief §15).
 * Swap the console calls for a real sink later if/when this goes to production.
 */
export type LogContext = "db" | "auth" | "repository" | "server-action" | "seed" | "demo" | "general";

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info(context: LogContext, message: string, meta?: Record<string, unknown>): void {
    console.log(`[${timestamp()}] [INFO] [${context}] ${message}`, meta ?? "");
  },
  warn(context: LogContext, message: string, meta?: Record<string, unknown>): void {
    console.warn(`[${timestamp()}] [WARN] [${context}] ${message}`, meta ?? "");
  },
  error(context: LogContext, message: string, error?: unknown): void {
    console.error(`[${timestamp()}] [ERROR] [${context}] ${message}`, error ?? "");
  },
};
