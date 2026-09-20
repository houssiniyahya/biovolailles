"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { IntegrityCheckCode } from "@/domain/integrity/types";
import { acknowledgeIntegrityIssueAction } from "./actions";

export function IntegrityAcknowledgeButton({
  code,
  entityType,
  entityId,
  description,
  acknowledged,
}: {
  code: IntegrityCheckCode;
  entityType: string;
  entityId: string;
  description: string;
  acknowledged: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (acknowledged) {
    return <span className="text-xs text-secondary">Pris en compte</span>;
  }

  async function handleClick() {
    setPending(true);
    await acknowledgeIntegrityIssueAction(code, entityType, entityId, description);
    setPending(false);
    router.refresh();
  }

  return (
    <Button size="sm" variant="ghost" onClick={handleClick} disabled={pending}>
      Accuser réception
    </Button>
  );
}
