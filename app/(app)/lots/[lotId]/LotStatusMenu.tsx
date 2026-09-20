"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { canTransition } from "@/domain/production/lot-lifecycle";
import { LOT_STATUS, type LotStatus } from "@/domain/shared/enums";
import { LOT_STATUS_LABEL } from "@/lib/status-colors";
import { transitionLotStatusAction } from "../actions";

export function LotStatusMenu({ lotId, currentStatus }: { lotId: string; currentStatus: LotStatus }) {
  const router = useRouter();
  const validNext = LOT_STATUS.filter((status) => canTransition(currentStatus, status));
  const [target, setTarget] = useState<LotStatus | "">(validNext[0] ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (validNext.length === 0) {
    return <p className="text-xs text-secondary">Statut final — aucune transition possible.</p>;
  }

  async function handleTransition() {
    if (!target) return;
    setPending(true);
    setError(null);
    const result = await transitionLotStatusAction(lotId, target);
    setPending(false);
    if (!result.ok) {
      setError(result.error?.message ?? "Transition impossible.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Select
          value={target}
          onChange={(event) => setTarget(event.target.value as LotStatus)}
          className="w-44"
          aria-label="Nouveau statut"
        >
          {validNext.map((status) => (
            <option key={status} value={status}>
              {LOT_STATUS_LABEL[status]}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="secondary" onClick={handleTransition} disabled={pending}>
          Changer le statut
        </Button>
      </div>
      {error ? <p className="text-xs text-critical-strong">{error}</p> : null}
    </div>
  );
}
