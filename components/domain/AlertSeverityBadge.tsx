import { Badge } from "@/components/ui/Badge";
import type { AlertSeverity } from "@/domain/shared/enums";
import { ALERT_SEVERITY_LABEL, ALERT_SEVERITY_TONE } from "@/lib/status-colors";

export function AlertSeverityBadge({ severity, className }: { severity: AlertSeverity; className?: string }) {
  return (
    <Badge tone={ALERT_SEVERITY_TONE[severity]} className={className}>
      {ALERT_SEVERITY_LABEL[severity]}
    </Badge>
  );
}
