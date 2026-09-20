"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { runLotDetectionAction } from "../actions";

/** Runs the rule engine on demand for this lot (phase-6 brief §10 — "the anomaly must be the result of the rule engine"). Idempotent — re-running never duplicates an already-open anomaly. */
export function RunDetectionButton({ lotId }: { lotId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setMessage(null);
    const result = await runLotDetectionAction(lotId);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error?.message ?? "Échec de l'évaluation.");
      return;
    }
    setMessage(result.data && result.data.created > 0 ? `${result.data.created} nouvelle(s) anomalie(s).` : "Aucune nouvelle anomalie.");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {message ? <span className="text-xs text-secondary">{message}</span> : null}
      <Button size="sm" variant="secondary" onClick={handleClick} disabled={pending}>
        <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
        Réévaluer
      </Button>
    </div>
  );
}
