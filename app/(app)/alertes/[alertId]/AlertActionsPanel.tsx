"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { AlertStatus } from "@/domain/shared/enums";
import { acknowledgeAlertAction, dismissAlertAction, resolveAlertAction } from "../actions";

type Kind = "ack" | "resolve" | "dismiss";

/** Acknowledge/resolve/dismiss (phase-6 brief §15) — every transition records an actor+timestamp+comment through services/intelligence/alerts.ts. */
export function AlertActionsPanel({ alertId, status }: { alertId: string; status: AlertStatus }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAcknowledge = status === "OPEN";
  const canResolve = status === "OPEN" || status === "ACKNOWLEDGED";
  const canDismiss = status === "OPEN" || status === "ACKNOWLEDGED";

  async function run(kind: Kind) {
    setPending(kind);
    setError(null);
    const action = kind === "ack" ? acknowledgeAlertAction : kind === "resolve" ? resolveAlertAction : dismissAlertAction;
    const result = await action(alertId, comment.trim() || undefined);
    setPending(null);
    if (!result.ok) {
      setError(result.error?.message ?? "Action impossible.");
      return;
    }
    setComment("");
    router.refresh();
  }

  if (!canAcknowledge && !canResolve && !canDismiss) {
    return <p className="text-xs text-secondary">Cette alerte est déjà {status === "RESOLVED" ? "résolue" : "écartée"}.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="alert-comment">
          Commentaire (optionnel)
        </Label>
        <Input id="alert-comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Résultat, remarque…" />
      </div>
      {error ? (
        <p role="alert" className="text-xs text-critical-strong">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {canAcknowledge ? (
          <Button size="sm" variant="secondary" disabled={pending !== null} onClick={() => run("ack")}>
            Prendre en compte
          </Button>
        ) : null}
        {canResolve ? (
          <Button size="sm" disabled={pending !== null} onClick={() => run("resolve")}>
            Résoudre
          </Button>
        ) : null}
        {canDismiss ? (
          <Button size="sm" variant="ghost" disabled={pending !== null} onClick={() => run("dismiss")}>
            Écarter
          </Button>
        ) : null}
      </div>
    </div>
  );
}
