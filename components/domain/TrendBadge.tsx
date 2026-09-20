import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { TrendResult } from "@/domain/intelligence/trend";

/** Compact ↑/↓/stable indicator (phase-6 brief §7) — never rendered without a real deviation behind it. */
export function TrendBadge({ trend }: { trend: TrendResult }) {
  if (trend.direction === "INSUFFICIENT_DATA") {
    return <Badge tone="neutral">Historique insuffisant</Badge>;
  }
  if (trend.direction === "STABLE") {
    return (
      <Badge tone="neutral" className="gap-1">
        <Minus className="size-3" aria-hidden="true" />
        Stable
      </Badge>
    );
  }
  const increasing = trend.direction === "INCREASING";
  return (
    <Badge tone={increasing ? "info" : "warning"} className="gap-1">
      {increasing ? <TrendingUp className="size-3" aria-hidden="true" /> : <TrendingDown className="size-3" aria-hidden="true" />}
      {trend.deviationPercent !== null ? `${trend.deviationPercent > 0 ? "+" : ""}${trend.deviationPercent}%` : ""}
    </Badge>
  );
}
