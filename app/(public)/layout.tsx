import type { ReactNode } from "react";

/**
 * Route-group layout for everything under /tracabilite — deliberately independent of the
 * authenticated app's Sidebar/Topbar (app/(app)/layout.tsx). No session is read here; this
 * group is public by design (see lib/public-paths.ts) and stays that way structurally, not
 * just by omission — there's nothing in this file that could accidentally start gating it.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
