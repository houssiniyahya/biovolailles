"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { resetDemoScenarioAction } from "./actions";

export function DemoResetPanel({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleReset() {
    setPending(true);
    setError(null);
    const result = await resetDemoScenarioAction();
    setPending(false);
    setConfirming(false);
    if (!result.ok) {
      setError(result.error?.message ?? "Réinitialisation impossible.");
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <Card className="border-gold/50">
      <CardHeader>
        <CardTitle>Réinitialiser la démonstration</CardTitle>
        <CardDescription>
          Efface toutes les données et rejoue le scénario déterministe BU-2026-001. Action destructive,
          réservée aux environnements de démonstration.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!enabled ? (
          <p className="text-xs text-secondary">
            Désactivée : <code className="font-mono">DEMO_MODE</code> est off. Ajoutez{" "}
            <code className="font-mono">DEMO_MODE=&quot;true&quot;</code> dans <code className="font-mono">.env.local</code> et relancez le serveur.
          </p>
        ) : confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-critical-strong">
              Toutes les données actuelles seront supprimées et remplacées par le jeu de démonstration. Confirmer ?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="destructive" disabled={pending} onClick={handleReset}>
                {pending ? "Réinitialisation…" : "Oui, réinitialiser"}
              </Button>
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Réinitialiser le scénario
            </Button>
            {done ? <span className="text-xs text-success-strong">Scénario restauré à son état initial.</span> : null}
          </div>
        )}
        {error ? <p className="text-xs text-critical-strong">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
