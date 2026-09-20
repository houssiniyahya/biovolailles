import { cn } from "@/lib/cn";

export type LiveState = "LIVE" | "SIMULATION" | "STALE" | "OFFLINE" | "FAULT";

/**
 * The five acquisition states §10 requires the interface to distinguish. Each carries a word
 * plus a dot shape, never colour alone (§18) — the pulse is reserved for LIVE, because a
 * dot that animates on every card stops meaning "this is updating right now".
 *
 * The previous "Live" chip was rendered in `bg-critical/10 text-critical` — a red, pulsing
 * badge on a perfectly healthy sensor, which reads as an alarm rather than as a heartbeat.
 */
const STATE: Record<LiveState, { label: string; dot: string; chip: string; pulse: boolean; title: string }> = {
  LIVE: {
    label: "En direct",
    dot: "bg-success",
    chip: "border-success/25 bg-success/10 text-success-strong",
    pulse: true,
    title: "Mesures reçues en continu.",
  },
  SIMULATION: {
    label: "Simulation",
    dot: "bg-gold",
    chip: "border-gold/45 bg-gold/15 text-deep-forest",
    pulse: false,
    title: "Valeurs produites par le simulateur — pas un capteur physique.",
  },
  STALE: {
    label: "Donnée obsolète",
    dot: "bg-warning",
    chip: "border-warning/30 bg-warning/10 text-warning-strong",
    pulse: false,
    title: "Aucune nouvelle mesure depuis un intervalle anormalement long.",
  },
  OFFLINE: {
    label: "Hors ligne",
    dot: "bg-muted",
    chip: "border-border bg-background text-secondary",
    pulse: false,
    title: "Appareil injoignable.",
  },
  FAULT: {
    label: "En défaut",
    dot: "bg-critical",
    chip: "border-critical/25 bg-critical/10 text-critical-strong",
    pulse: false,
    title: "L'appareil signale une panne.",
  },
};

export function LiveIndicator({ state, className }: { state: LiveState; className?: string }) {
  const config = STATE[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-micro font-bold uppercase tracking-wide",
        config.chip,
        className
      )}
      title={config.title}
    >
      <span className={cn("size-1.5 rounded-full", config.dot, config.pulse && "animate-pulse")} aria-hidden="true" />
      {config.label}
    </span>
  );
}
