import { redirect } from "next/navigation";

/**
 * The deployed origin IS `/`. There is no marketing site, so the front door
 * funnels straight into the app: /login bounces an already-authenticated
 * visitor onward to /dashboard (see app/(auth)/login/page.tsx).
 */
export default function Home() {
  redirect("/login");
}
