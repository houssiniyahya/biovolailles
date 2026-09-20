import { Badge } from "@/components/ui/Badge";
import type { LotStatus } from "@/domain/shared/enums";
import { LOT_STATUS_LABEL, LOT_STATUS_TONE } from "@/lib/status-colors";

export function LotStatusBadge({ status, className }: { status: LotStatus; className?: string }) {
  return (
    <Badge tone={LOT_STATUS_TONE[status]} className={className}>
      {LOT_STATUS_LABEL[status]}
    </Badge>
  );
}
