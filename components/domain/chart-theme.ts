/**
 * Recharts renders through inline SVG props, not Tailwind classes, so chart colours can't
 * consume the `@theme` tokens the way the rest of the UI does. Rather than let hex values
 * sit inline in each chart (two of them had `#2F7D4A` typed in by hand), the palette is
 * mirrored here once and imported. If a token changes in globals.css, this is the single
 * other place to update.
 */
export const CHART = {
  series: "#2f7d4a",
  seriesMuted: "#4e9860",
  grid: "#dde5de",
  axis: "#7a8780",
  axisLabel: "#52605a",
  surface: "#ffffff",
  border: "#dde5de",
  text: "#1c2922",
} as const;

/** Shared axis styling so every chart in the app has identical tick treatment. */
export const AXIS_TICK = { fontSize: 11, fill: CHART.axisLabel } as const;

export const TOOLTIP_STYLE = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 8,
    border: `1px solid ${CHART.border}`,
    backgroundColor: CHART.surface,
    color: CHART.text,
    boxShadow: "0 4px 12px rgb(20 32 26 / 0.08)",
    padding: "8px 10px",
  },
  labelStyle: { fontSize: 11, color: CHART.axisLabel, marginBottom: 2 },
  cursor: { fill: "rgb(47 125 74 / 0.06)" },
} as const;
