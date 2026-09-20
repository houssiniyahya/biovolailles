/**
 * Centralized KPI registry (phase-6 brief §2) — the ONLY place a KPI's label/unit/formula/
 * required inputs/period definition are declared. Services compute against this; UI
 * components only render what a computation returns, never re-derive a formula themselves.
 * The `kpi_definitions` DB table (data/repositories/kpi-definition.repository.ts) is a thin
 * persisted mirror of the `code`/`label`/`unit`/`formula` fields here, seeded once, so
 * `kpi_values.kpiDefinitionId` has something real to reference — the richer fields
 * (description, requiredInputs, eligibility notes, period definition) stay in code, where
 * they're type-checked and testable.
 */

export const KPI_CODE = [
  "CURRENT_POPULATION",
  "MORTALITY_RATE",
  "AVERAGE_WEIGHT",
  "FEED_CONSUMPTION",
  "WATER_CONSUMPTION",
  "FCR",
] as const;
export type KpiCode = (typeof KPI_CODE)[number];

export type KpiPeriodKind = "INSTANT" | "ROLLING_PERIOD";

export interface KpiDefinitionSpec {
  code: KpiCode;
  label: string;
  unit: string;
  description: string;
  formula: string;
  requiredInputs: string[];
  periodKind: KpiPeriodKind;
  periodDescription: string;
}

export const KPI_DEFINITIONS: Record<KpiCode, KpiDefinitionSpec> = {
  CURRENT_POPULATION: {
    code: "CURRENT_POPULATION",
    label: "Population actuelle",
    unit: "sujets",
    description: "Nombre de sujets actuellement présents dans le lot.",
    formula: "population_initiale − mortalité cumulée − sorties + entrées",
    requiredInputs: ["lots.currentPopulation", "réconciliation de population (Phase 3)"],
    periodKind: "INSTANT",
    periodDescription: "Valeur instantanée, au moment du calcul.",
  },
  MORTALITY_RATE: {
    code: "MORTALITY_RATE",
    label: "Taux de mortalité",
    unit: "%",
    description: "Part du cheptel perdue sur la période, rapportée à la population de référence.",
    formula: "(mortalité sur la période / population initiale de la période) × 100",
    requiredInputs: ["mortality_records"],
    periodKind: "ROLLING_PERIOD",
    periodDescription: "Période glissante (par défaut 7 derniers jours).",
  },
  AVERAGE_WEIGHT: {
    code: "AVERAGE_WEIGHT",
    label: "Poids moyen",
    unit: "kg",
    description: "Poids moyen le plus récent, issu d'une pesée sur échantillon.",
    formula: "moyenne du dernier relevé de pesée sur la période",
    requiredInputs: ["weight_measurement_records"],
    periodKind: "ROLLING_PERIOD",
    periodDescription: "Dernier relevé disponible dans la période glissante.",
  },
  FEED_CONSUMPTION: {
    code: "FEED_CONSUMPTION",
    label: "Consommation d'aliment",
    unit: "kg",
    description: "Quantité d'aliment distribuée sur la période.",
    formula: "somme des quantités d'aliment enregistrées sur la période",
    requiredInputs: ["feed_usage_records"],
    periodKind: "ROLLING_PERIOD",
    periodDescription: "Période glissante (par défaut 7 derniers jours).",
  },
  WATER_CONSUMPTION: {
    code: "WATER_CONSUMPTION",
    label: "Consommation d'eau",
    unit: "L",
    description: "Volume d'eau consommé sur la période.",
    formula: "somme des volumes d'eau enregistrés sur la période",
    requiredInputs: ["water_usage_records"],
    periodKind: "ROLLING_PERIOD",
    periodDescription: "Période glissante (par défaut 7 derniers jours).",
  },
  FCR: {
    code: "FCR",
    label: "Indice de consommation (FCR)",
    unit: "kg aliment / kg gain",
    description: "Quantité d'aliment nécessaire pour produire un kilogramme de gain de poids.",
    formula: "aliment consommé sur la période / gain de poids sur la même période",
    requiredInputs: ["feed_usage_records", "au moins deux weight_measurement_records encadrant la période"],
    periodKind: "ROLLING_PERIOD",
    periodDescription: "Entre les deux pesées les plus récentes — non calculable hors de cette fenêtre.",
  },
};
