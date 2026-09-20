import { Badge } from "@/components/ui/Badge";
import type { AlertStatus } from "@/domain/shared/enums";
import { ALERT_STATUS_LABEL, ALERT_STATUS_TONE } from "@/lib/status-colors";

export function AlertStatusBadge({ status, className }: { status: AlertStatus; className?: string }) {
  return (
    <Badge tone={ALERT_STATUS_TONE[status]} className={className}>
      {ALERT_STATUS_LABEL[status]}
    </Badge>
  );
}
