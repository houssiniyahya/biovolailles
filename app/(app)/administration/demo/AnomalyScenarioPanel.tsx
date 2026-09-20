"use client";

import { Play, Rewind } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { resetHeroToNormalAction, triggerHeroAnomalyAction } from "./actions";

/**
 * Presenter control for the "normal → deviation → anomaly → alert" sequence (phase-15 §5/§6).
 *
 * Both buttons go through the real services: rewinding reseeds the dataset without the hero's
 * deviation records, and triggering writes those records and runs the actual rule engine. No
 * alert is ever fabricated here — the engine decides, exactly as it does at seed time.
 */
export function AnomalyScenarioPanel({ enabled, anomalyPresent }: { enabled: boolean; anomalyPresent: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<"normal" | "anomaly" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(which: "normal" | "anomaly") {
    setPending(which);
    setError(null);
    setMessage(null);
    const result = which === "normal" ? await resetHeroToNormalAction() : await triggerHeroAnomalyAction();
    setPending(null);
    if (!result.ok) {
      setError(result.error?.message ?? "Commande impossible.");
      return;
    }
    setMessage(
      which === "normal"
        ? "Lot héros ramené à l'état normal — aucune anomalie ouverte."
        : "Moteur de règles exécuté — anomalie et alerte créées."
    );
    router.refresh();
  }

  return (
    <Card className="border-gold/50">
      <CardHeader>
        <CardTitle>Rejouer le scénario d&apos;anomalie</CardTitle>
        <CardDescription>
          Permet de montrer la séquence en direct : mesures normales → écart → anomalie → alerte. Le moteur
          de règles réel décide — aucune alerte n&apos;est pré-écrite.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!enabled ? (
          <p className="text-caption text-secondary">
            Désactivé : <code className="font-mono">DEMO_MODE</code> est off. Ajoutez{" "}
            <code className="font-mono">DEMO_MODE=&quot;true&quot;</code> dans <code className="font-mono">.env.local</code> et relancez le serveur.
          </p>
        ) : (
          <>
            <p className="text-caption text-secondary">
              État actuel du lot héros :{" "}
              {anomalyPresent ? (
                <strong className="text-critical-strong">anomalie ouverte</strong>
              ) : (
                <strong className="text-success-strong">normal, aucune anomalie</strong>
              )}
              .
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                loading={pending === "normal"}
                disabled={pending !== null}
                onClick={() => run("normal")}
              >
                <Rewind className="size-4" aria-hidden="true" />
                1 · Revenir à l&apos;état normal
              </Button>
              <Button size="sm" loading={pending === "anomaly"} disabled={pending !== null} onClick={() => run("anomaly")}>
                <Play className="size-4" aria-hidden="true" />
                2 · Déclencher l&apos;écart
              </Button>
            </div>
            <p className="text-micro leading-relaxed text-secondary">
              « Revenir à l&apos;état normal » réamorce le jeu de données et vous déconnecte des autres onglets.
              « Déclencher l&apos;écart » écrit les mesures et lance la détection, sans réamorçage.
            </p>
          </>
        )}
        {message ? <p className="text-caption font-medium text-success-strong">{message}</p> : null}
        {error ? <p className="text-caption text-critical-strong">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
