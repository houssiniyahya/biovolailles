import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolvePublicPassport } from "@/services/public/passport";
import { PassportView } from "./PassportView";

export const metadata: Metadata = {
  title: "Passeport de traçabilité — BIOVOLAILLES",
  description: "Vérifiez l'origine et le parcours de ce produit avicole.",
};

/**
 * The public gateway (phase-9 brief §1): resolvePublicPassport() is the ONLY data access this
 * route performs — no repository import here, ever. An invalid, revoked, or expired token
 * resolves to null and reads as a plain 404, indistinguishable from a token that never existed.
 */
export default async function PublicPassportPage({ params }: PageProps<"/tracabilite/[token]">) {
  const { token } = await params;
  const passport = await resolvePublicPassport(token);
  if (!passport) notFound();

  return <PassportView passport={passport} />;
}
