import { checkStaleReading } from "../quality/iot-data-quality";
import type { PopulationReconciliation } from "../production/reconciliation";
import type { AlertSeverity, DataStatus } from "../shared/enums";
import type { RuleCode } from "./rule-definitions";
import type { AnomalyExplanation, Confidence } from "./types";

/**
 * Transparent, explainable rule evaluators (phase-6 brief §8) — threshold/range/compound
 * comparisons only, no statistics beyond a plain percentage deviation. Each function is pure:
 * given already-fetched data it returns either a full trigger result (with a real,
 * number-filled explanation) or `null` when the condition doesn't hold. The architecture
 * stays open for a smarter evaluator later — a future function could implement the same
 * `RuleTriggerResult` contract without touching callers.
 */

export interface RuleTriggerResult {
  ruleCode: RuleCode;
  severity: AlertSeverity;
  observedValue: number;
  referenceValue: number;
  deviationPercent: number;
  unit: string;
  confidence: Confidence;
  explanation: AnomalyExplanation;
}

export interface LotContext {
  lotCode: string;
  farmName: string;
  buildingCode: string;
}

export interface BuildingContext {
  farmName: string;
  buildingCode: string;
}

/** Confidence is tied to data status, never an arbitrary percentage (phase-6 brief §13). */
export function confidenceFromDataStatus(status: DataStatus): Confidence {
  if (status === "REEL" || status === "VALIDE") return "HIGH";
  if (status === "SIMULATION" || status === "CALCULE" || status === "ESTIME") return "MEDIUM";
  return "LOW"; // A_CONFIRMER, MANQUANT, TEST
}

export function evaluateTemperatureRange(
  reading: { value: number; capturedAt: string; dataStatus: DataStatus },
  context: BuildingContext,
  config: { min: number; max: number }
): RuleTriggerResult | null {
  const { value, capturedAt, dataStatus } = reading;
  if (value >= config.min && value <= config.max) return null;

  const belowMin = value < config.min;
  const boundValue = belowMin ? config.min : config.max;
  const breach = Math.abs(value - boundValue);
  const severity: AlertSeverity = breach > 3 ? "CRITICAL" : "WARNING";

  return {
    ruleCode: "TEMPERATURE_OUT_OF_RANGE",
    severity,
    observedValue: value,
    referenceValue: boundValue,
    deviationPercent: Math.round((breach / boundValue) * 1000) / 10,
    unit: "°C",
    confidence: confidenceFromDataStatus(dataStatus),
    explanation: {
      what: "Température hors plage",
      where: `${context.buildingCode} — ${context.farmName}`,
      when: capturedAt,
      whatChanged: `La température mesurée a dépassé la limite ${belowMin ? "minimale" : "maximale"} configurée.`,
      comparedTo: `Plage attendue : ${config.min}°C – ${config.max}°C.`,
      byHowMuch: `${value}°C, soit ${breach.toFixed(1)}°C au-delà de la limite ${belowMin ? "minimale" : "maximale"} (${boundValue}°C).`,
      basedOnData: `Dernière mesure du capteur de température (${dataStatus}).`,
      whyTriggered: `La règle "Température hors plage" se déclenche dès qu'une lecture sort de [${config.min}°C, ${config.max}°C].`,
    },
  };
}

export function evaluateFeedDeviation(
  currentKg: number,
  referenceKg: number,
  context: LotContext,
  periodLabel: string,
  dataStatus: DataStatus,
  thresholdPercent: number
): RuleTriggerResult | null {
  if (referenceKg <= 0 || currentKg <= 0) return null;
  const deviationPercent = Math.round(((currentKg - referenceKg) / referenceKg) * 1000) / 10;
  if (deviationPercent <= thresholdPercent) return null;

  const severity: AlertSeverity = deviationPercent > thresholdPercent * 2 ? "CRITICAL" : "WARNING";
  return {
    ruleCode: "FEED_DEVIATION_ABOVE_REFERENCE",
    severity,
    observedValue: currentKg,
    referenceValue: referenceKg,
    deviationPercent,
    unit: "kg",
    confidence: confidenceFromDataStatus(dataStatus),
    explanation: {
      what: "Consommation d'aliment anormalement élevée",
      where: `Lot ${context.lotCode} — ${context.farmName}, ${context.buildingCode}`,
      when: periodLabel,
      whatChanged: `La consommation d'aliment a augmenté de ${deviationPercent}% par rapport à sa référence récente.`,
      comparedTo: `Référence : moyenne de la période précédente (${referenceKg} kg).`,
      byHowMuch: `+${deviationPercent}% (${currentKg} kg vs ${referenceKg} kg).`,
      basedOnData: `Enregistrements d'alimentation structurés (${dataStatus}).`,
      whyTriggered: `La règle "Déviation d'alimentation" se déclenche au-delà de +${thresholdPercent}% par rapport à la référence.`,
    },
  };
}

export function evaluatePerformanceDecline(
  feedDeviationPercent: number,
  growthDeviationPercent: number,
  context: LotContext,
  periodLabel: string,
  dataStatus: DataStatus,
  config: { feedThresholdPercent: number; growthDeclineThresholdPercent: number }
): RuleTriggerResult | null {
  const feedUp = feedDeviationPercent > config.feedThresholdPercent;
  const growthDown = growthDeviationPercent < -config.growthDeclineThresholdPercent;
  if (!(feedUp && growthDown)) return null;

  const severity: AlertSeverity = growthDeviationPercent < -config.growthDeclineThresholdPercent * 2 ? "CRITICAL" : "WARNING";
  return {
    ruleCode: "PERFORMANCE_DECLINE",
    severity,
    observedValue: feedDeviationPercent,
    referenceValue: growthDeviationPercent,
    deviationPercent: feedDeviationPercent,
    unit: "%",
    confidence: confidenceFromDataStatus(dataStatus),
    explanation: {
      what: "Dégradation de performance",
      where: `Lot ${context.lotCode} — ${context.farmName}, ${context.buildingCode}`,
      when: periodLabel,
      whatChanged: "La consommation d'aliment a augmenté au-delà de la référence pendant que la croissance ralentissait sur la même période.",
      comparedTo: "Référence : période précédente équivalente (aliment et rythme de croissance).",
      byHowMuch: `Aliment +${feedDeviationPercent}% — croissance ${growthDeviationPercent}%.`,
      basedOnData: `Enregistrements d'alimentation et de pesée structurés (${dataStatus}).`,
      whyTriggered: `La règle "Dégradation de performance" combine deux conditions réunies ici : aliment au-delà de +${config.feedThresholdPercent}% ET croissance en retrait de plus de ${config.growthDeclineThresholdPercent}%.`,
    },
  };
}

export function evaluatePopulationInconsistency(
  reconciliation: PopulationReconciliation,
  context: LotContext,
  dataStatus: DataStatus,
  detectedAt: string
): RuleTriggerResult | null {
  if (reconciliation.consistent) return null;

  const magnitudePercent =
    reconciliation.initialPopulation > 0
      ? Math.round((Math.abs(reconciliation.difference) / reconciliation.initialPopulation) * 1000) / 10
      : 0;
  const severity: AlertSeverity = magnitudePercent > 1 ? "CRITICAL" : "WARNING";

  return {
    ruleCode: "POPULATION_INCONSISTENCY",
    severity,
    observedValue: reconciliation.recordedPopulation,
    referenceValue: reconciliation.expectedPopulation,
    deviationPercent: reconciliation.difference >= 0 ? magnitudePercent : -magnitudePercent,
    unit: "sujets",
    confidence: confidenceFromDataStatus(dataStatus),
    explanation: {
      what: "Incohérence d'effectif",
      where: `Lot ${context.lotCode} — ${context.farmName}, ${context.buildingCode}`,
      when: detectedAt,
      whatChanged: "La population enregistrée ne correspond plus à celle attendue d'après l'historique des événements.",
      comparedTo: `Population attendue d'après l'historique : ${reconciliation.expectedPopulation} sujets.`,
      byHowMuch: `Écart de ${reconciliation.difference} sujet(s) (population enregistrée : ${reconciliation.recordedPopulation}).`,
      basedOnData: `Population initiale, mortalité, sorties et entrées enregistrées (${dataStatus}).`,
      whyTriggered: "La règle \"Incohérence d'effectif\" se déclenche dès que la réconciliation détecte un écart, quel qu'il soit.",
    },
  };
}

export function evaluateStaleSensor(
  reading: { capturedAt: string; dataStatus: DataStatus },
  context: BuildingContext,
  now: Date,
  thresholdMinutes: number
): RuleTriggerResult | null {
  const issue = checkStaleReading(reading.capturedAt, now, thresholdMinutes);
  if (!issue) return null;

  const ageMinutes = Math.round((now.getTime() - new Date(reading.capturedAt).getTime()) / 60_000);
  return {
    ruleCode: "STALE_SENSOR_DATA",
    severity: "WARNING",
    observedValue: ageMinutes,
    referenceValue: thresholdMinutes,
    deviationPercent: Math.round(((ageMinutes - thresholdMinutes) / thresholdMinutes) * 1000) / 10,
    unit: "min",
    confidence: confidenceFromDataStatus(reading.dataStatus),
    explanation: {
      what: "Données capteur obsolètes",
      where: `${context.buildingCode} — ${context.farmName}`,
      when: reading.capturedAt,
      whatChanged: "Le capteur n'a transmis aucune nouvelle mesure depuis sa dernière lecture connue.",
      comparedTo: `Seuil de fraîcheur configuré : ${thresholdMinutes} minutes.`,
      byHowMuch: `${ageMinutes} minutes écoulées, soit ${ageMinutes - thresholdMinutes} de plus que le seuil.`,
      basedOnData: `Dernière mesure connue (${reading.dataStatus}).`,
      whyTriggered: issue.message,
    },
  };
}
