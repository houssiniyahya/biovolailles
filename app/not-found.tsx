import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <FileQuestion className="size-8 text-muted" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-text">Introuvable</p>
        <p className="mt-1 max-w-sm text-sm text-secondary">
          Cet enregistrement n&apos;existe pas ou a été supprimé.
        </p>
      </div>
      <Button asChild variant="secondary" size="sm">
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}
