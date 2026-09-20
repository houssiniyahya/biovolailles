"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] Unhandled page error", error);
  }, [error]);

  return (
    <ErrorState
      title="Cette page n'a pas pu être chargée"
      message="Les données n'ont pas pu être récupérées. Réessayez ; si le problème persiste, transmettez la référence ci-dessous à un administrateur."
      reference={error.digest}
      onRetry={reset}
    />
  );
}
