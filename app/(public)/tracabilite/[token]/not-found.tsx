import { ShieldOff } from "lucide-react";

/**
 * Deliberately generic: an invalid, revoked, and expired token all land here identically
 * (services/public/passport.ts returns null for all three) — a visitor scanning around for
 * "still valid" tokens learns nothing from this page's wording either way.
 */
export default function PublicPassportNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <ShieldOff className="size-9 text-muted" aria-hidden="true" />
      <p className="text-base font-semibold text-text">Passeport introuvable</p>
      <p className="max-w-xs text-sm text-secondary">
        Ce lien de traçabilité n&apos;est pas valide, a expiré ou a été révoqué.
      </p>
      <p className="mt-4 text-xs text-secondary">BIOVOLAILLES</p>
    </main>
  );
}
