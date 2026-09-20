import type { ReactNode } from "react";

/**
 * `<main>` rather than a bare `<div>`: the login screen is a page in its own right, and
 * without a main landmark a screen-reader user has nothing to jump to (phase-13 brief §9).
 * Padding tightens on the narrowest phones so the card keeps its full width at 375px.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-background p-4 sm:p-6">{children}</main>
  );
}
