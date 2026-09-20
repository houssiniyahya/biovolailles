import { redirect } from "next/navigation";
import { getCurrentSession } from "@/services/auth/session";
import { LoginForm } from "./LoginForm";

const DEFAULT_NEXT = "/dashboard";

/** Any absolute base works — it exists only so the parser can tell same-origin from off-origin. */
const ORIGIN_PROBE = "http://login-next.invalid";

/**
 * `?next=` is attacker-controllable, and this app is publicly reachable once deployed, so the
 * post-login redirect is an open-redirect target: a link to our own domain that bounces the
 * freshly-authenticated visitor to someone else's.
 *
 * A `startsWith("/")` test is not enough — `//evil.com` is protocol-relative and browsers treat
 * it as absolute — and neither is a hand-rolled `//` rejection, because the URL parser strips
 * tabs and newlines, so `/\t/evil.com` becomes `//evil.com` after we have already checked it.
 * So we let the parser resolve the value and keep it only if it stayed on our own origin,
 * re-serializing just the path/query/hash.
 */
function safeNextPath(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/")) return DEFAULT_NEXT;
  try {
    const resolved = new URL(value, ORIGIN_PROBE);
    if (resolved.origin !== ORIGIN_PROBE) return DEFAULT_NEXT;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return DEFAULT_NEXT;
  }
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await getCurrentSession();
  const params = await searchParams;
  const next = safeNextPath(params.next);

  if (session) {
    redirect(next);
  }

  return <LoginForm next={next} />;
}
