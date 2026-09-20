import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { DataStatus } from "@/domain/shared/enums";
import { cn } from "@/lib/cn";
import { DATA_STATUS_LABEL, DATA_STATUS_TONE } from "@/lib/status-colors";

/**
 * Never render raw/computed values without this next to them — simulated or unvalidated
 * data must never look identical to validated real data (ARCHITECTURE.md §7).
 */
export function DataStatusBadge({ status, className }: { status: DataStatus; className?: string }) {
  return (
    <Badge tone={DATA_STATUS_TONE[status]} className={cn("gap-1", className)}>
      {status === "SIMULATION" ? <FlaskConical className="size-3" aria-hidden="true" /> : null}
      {DATA_STATUS_LABEL[status]}
    </Badge>
  );
}
