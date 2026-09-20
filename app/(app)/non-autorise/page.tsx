import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <ShieldAlert className="size-8 text-critical-strong" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-text">Accès non autorisé</p>
        <p className="mt-1 max-w-sm text-sm text-secondary">
          Cette ressource n&apos;appartient pas à votre périmètre ou votre rôle n&apos;y donne pas accès.
        </p>
      </div>
      <Button asChild variant="secondary" size="sm">
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}
