import type { EntityContract, EntityInspection, WithheldEntityField } from '../../tools/wh3-importer/entity-semantics/contract.mjs';
import type { NormalizationContext, NormalizedUnitResult } from '../../tools/wh3-importer/normalization/normalizer.mjs';
import type { MaterializationResult } from '../../tools/wh3-importer/catalog-identity/materialize.mjs';

export function entityMetadata(inspection: EntityInspection, context: NormalizationContext, result: NormalizedUnitResult, materialization: MaterializationResult) {
  context.entityInspection = inspection;
  materialization.entityInspection = inspection;
  const contract: EntityContract = inspection.contract;
  const withheld: WithheldEntityField[] = result.entityPresentation?.withheldFields ?? [];
  const countSafe: false = contract.presentation.countSafe;
  const hpSafe: false = contract.presentation.hpSafe;
  return { contract, withheld, countSafe, hpSafe };
}
