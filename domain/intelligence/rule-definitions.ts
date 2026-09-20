import type { AlertSeverity } from "../shared/enums";
import type { RuleCondition } from "./types";

/**
 * Centralized rule registry (phase-6 brief §9) — a small, deliberately short list that each
 * demonstrates real value rather than a wall of near-duplicate thresholds. The `rules` DB
 * table (data/repositories/rule.repository.ts) is a thin persisted mirror of these specs,
 * seeded once, so `anomalies.ruleId` has something real to reference; the actual evaluation
 * logic lives in rule-engine.ts.
 */
export const RULE_CODE = [
  "TEMPERATURE_OUT_OF_RANGE",
  "FEED_DEVIATION_ABOVE_REFERENCE",
  "PERFORMANCE_DECLINE",
  "POPULATION_INCONSISTENCY",
  "STALE_SENSOR_DATA",
] as const;
export type RuleCode = (typeof RULE_CODE)[number];

export interface RuleDefinitionSpec {
  code: RuleCode;
  name: string;
  target: string;
  description: string;
  /** Base severity — an evaluator may escalate to CRITICAL when the breach is large (see rule-engine.ts). */
  severity: AlertSeverity;
  condition: RuleCondition;
  explanationTemplate: string;
  active: boolean;
}

export const RULE_DEFINITIONS: Record<RuleCode, RuleDefinitionSpec> = {
  TEMPERATURE_OUT_OF_RANGE: {
    code: "TEMPERATURE_OUT_OF_RANGE",
    name: "Température hors plage",
    target: "sensor:TEMPERATURE",
    /*
     * An ABSOLUTE safety envelope, not an age-adjusted setpoint. Broiler target temperature
     * falls with age (32-34 degC during brooding, ~21 degC at finishing), so a single band
     * cannot flag "28 degC is too hot for a five-week flock". 18-33 degC is the outer envelope
     * outside which any bird of any age is stressed. The wording below says so, rather than
     * calling it "the expected rearing range" and implying an age-aware setpoint the engine
     * does not have — see RELEASE_NOTES.md for the limitation.
     */
    description:
      "Enveloppe de sécurité absolue : détecte une température hors des bornes tolérables quel que soit l'âge du lot. Ne remplace pas une consigne ajustée à l'âge.",
    severity: "WARNING",
    condition: { operator: "OUT_OF_RANGE", threshold: 0, min: 18, max: 33 },
    explanationTemplate:
      "La température mesurée est sortie de l'enveloppe de sécurité [{min}°C – {max}°C], tolérable à tout âge.",
    active: true,
  },
  FEED_DEVIATION_ABOVE_REFERENCE: {
    code: "FEED_DEVIATION_ABOVE_REFERENCE",
    name: "Déviation d'alimentation",
    target: "kpi:FEED_CONSUMPTION",
    description: "Détecte une consommation d'aliment nettement supérieure à sa référence récente.",
    severity: "WARNING",
    condition: { operator: "GT", threshold: 15 },
    explanationTemplate: "La consommation d'aliment a dépassé sa référence de plus de {threshold}%.",
    active: true,
  },
  PERFORMANCE_DECLINE: {
    code: "PERFORMANCE_DECLINE",
    name: "Dégradation de performance",
    target: "kpi:AVERAGE_WEIGHT",
    description:
      "Détecte une consommation d'aliment en hausse combinée à un ralentissement de la croissance — un signal de performance, pas une simple déviation isolée.",
    severity: "WARNING",
    condition: { operator: "COMPOUND", threshold: 10, secondaryThreshold: -10 },
    explanationTemplate:
      "La consommation d'aliment a augmenté au-delà de la référence pendant que la croissance ralentissait sur la même période.",
    active: true,
  },
  POPULATION_INCONSISTENCY: {
    code: "POPULATION_INCONSISTENCY",
    name: "Incohérence d'effectif",
    target: "population",
    description: "Détecte un écart entre la population enregistrée et la population attendue d'après l'historique des événements.",
    severity: "WARNING",
    condition: { operator: "GT", threshold: 0 },
    explanationTemplate: "La population enregistrée diffère de la population attendue d'après l'historique.",
    active: true,
  },
  STALE_SENSOR_DATA: {
    code: "STALE_SENSOR_DATA",
    name: "Données capteur obsolètes",
    target: "iot:staleness",
    description: "Détecte un capteur en ligne dont la dernière lecture dépasse le seuil de fraîcheur attendu.",
    severity: "WARNING",
    condition: { operator: "GT", threshold: 60 },
    explanationTemplate: "Le capteur n'a pas transmis de nouvelle mesure depuis plus de {threshold} minutes.",
    active: true,
  },
};
