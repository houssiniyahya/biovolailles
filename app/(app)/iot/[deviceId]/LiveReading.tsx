"use client";

import { useEffect, useState } from "react";
import { LiveIndicator, type LiveState } from "@/components/domain/LiveIndicator";
import { Skeleton } from "@/components/ui/Loading";
import type { DataStatus } from "@/domain/shared/enums";
import { getLiveReadingAction, type LiveReadingPayload } from "../actions";

const POLL_INTERVAL_MS = 15_000;
/** Past this without a fresh capture, the reading is labelled STALE rather than shown as live. */
const STALE_AFTER_MS = 3 * 60_000;

function relativeAge(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `il y a ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.round(minutes / 60)} h`;
}

export function LiveReading({ sensorId, unit, dataStatus }: { sensorId: string; unit: string; dataStatus?: DataStatus }) {
  const [reading, setReading] = useState<LiveReadingPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function poll() {
      // Polling a hidden tab burns a server action round-trip per sensor for nobody to see.
      if (document.hidden) return;
      const result = await getLiveReadingAction(sensorId);
      if (cancelled) return;
      if (result) {
        setReading(result);
        setFailed(false);
      } else {
        setFailed(true);
      }
      setNow(Date.now());
    }

    function start() {
      timer = setInterval(poll, POLL_INTERVAL_MS);
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
    }
    function onVisibility() {
      if (document.hidden) {
        stop();
      } else {
        void poll();
        if (!timer) start();
      }
    }

    void poll();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sensorId]);

  /*
   * The age label used to re-render this component every second, forever, purely to advance a
   * counter. It now ticks on the poll cycle only — a 15 s granularity on a 15 s poll, which
   * is all the precision the number can honestly claim anyway (§21).
   */
  useEffect(() => {
    const tick = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, POLL_INTERVAL_MS);
    return () => clearInterval(tick);
  }, []);

  if (!reading) {
    return failed ? (
      <p className="text-sm text-secondary">Mesure en direct indisponible pour ce capteur.</p>
    ) : (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-3 w-40" />
      </div>
    );
  }

  const age = Math.max(0, now - new Date(reading.capturedAt).getTime());
  const state: LiveState = dataStatus === "SIMULATION" ? "SIMULATION" : age > STALE_AFTER_MS ? "STALE" : "LIVE";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-text">
          {reading.value.toLocaleString("fr-FR")}
        </span>
        <span className="text-sm text-secondary">{unit}</span>
        <LiveIndicator state={state} className="ml-1 self-center" />
      </div>
      <p className="text-caption text-secondary">
        Dernière mesure {relativeAge(age)}
        {state === "STALE" ? " — aucune donnée récente reçue de ce capteur." : ""}
      </p>
    </div>
  );
}
