import { getIronSession } from "iron-session";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicPath } from "./lib/public-paths";
import { sessionOptions, type SessionData } from "./services/auth/config";

/**
 * Route guard only: does a session exist, and if not, redirect to /login.
 * This is NOT the authorization boundary — it only checks *authentication*.
 * Every Server Action/service still authenticates+authorizes on its own
 * (see services/auth/session.ts requireSession, domain/shared/permissions.ts can()),
 * because proxy coverage can silently disappear on a matcher edit or a Server
 * Function reached directly. See ARCHITECTURE.md §8 and §13.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.userId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
