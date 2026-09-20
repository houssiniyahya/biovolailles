import { KPI_DEFINITIONS } from "../../../domain/intelligence/kpi-definitions";
import { RULE_DEFINITIONS } from "../../../domain/intelligence/rule-definitions";
import { repositories } from "../../repositories";

/**
 * Seeds the persisted mirrors of the KPI and rule registries (domain/intelligence/kpi-definitions.ts,
 * rule-definitions.ts) so both catalogs are fully populated from a fresh `db:reset`, not only
 * lazily created the first time a rule happens to fire.
 */
export async function seedIntelligenceDefinitions(): Promise<void> {
  for (const spec of Object.values(KPI_DEFINITIONS)) {
    await repositories.kpiDefinitions.create({ code: spec.code, label: spec.label, unit: spec.unit, formulaDesc: spec.formula });
  }
  for (const spec of Object.values(RULE_DEFINITIONS)) {
    await repositories.rules.create({
      name: spec.name,
      target: spec.target,
      condition: spec.condition,
      severity: spec.severity,
      active: spec.active,
      description: spec.description,
      explanationTemplate: spec.explanationTemplate,
    });
  }
}
