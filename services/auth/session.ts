import { cache } from "react";
import { cookies } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";
import { AuthorizationError } from "../../domain/shared/errors";
import type { PermissionSubject } from "../../domain/shared/permissions";
import { sessionOptions, type SessionData } from "./config";

// No `import "server-only"` — see lib/env.ts. `next/headers` is itself unusable outside
// a real Next.js request, which already keeps this out of any client bundle.

/** Fully-populated session for a logged-in user. Satisfies PermissionSubject so it plugs straight into can(). */
export interface Session extends PermissionSubject {
  userId: string;
  isDemoSwitch: boolean;
}

async function getIronSessionInstance(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Reads the current session, if any. Cached per request (React cache()) so multiple
 * Server Components/Actions in the same render can call this without re-decrypting
 * the cookie each time. Returns null when no one is logged in — callers decide
 * whether that's an error (see requireSession).
 */
export const getCurrentSession = cache(async (): Promise<Session | null> => {
  const ironSession = await getIronSessionInstance();
  if (!ironSession.userId || !ironSession.role || !ironSession.scopeType) {
    return null;
  }
  return {
    userId: ironSession.userId,
    role: ironSession.role,
    scopeType: ironSession.scopeType,
    scopeId: ironSession.scopeId ?? null,
    isDemoSwitch: ironSession.isDemoSwitch ?? false,
  };
});

/** Same as getCurrentSession but throws for routes/actions that require a logged-in user. */
export async function requireSession(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) throw new AuthorizationError("Connexion requise.");
  return session;
}

/** Internal — only login()/logout() should reach for the raw iron-session instance. */
export async function getMutableIronSession(): Promise<IronSession<SessionData>> {
  return getIronSessionInstance();
}
