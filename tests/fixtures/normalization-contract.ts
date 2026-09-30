import type { Unit } from '../../src/domain/unit';
import type { NormalizedUnitResult, MappingKind } from '../../tools/wh3-importer/normalization/normalizer.mjs';

// Compile-time API contract; runtime shape is checked by validateUnits tests.
export function normalizedUnitContract(result: NormalizedUnitResult): Unit {
  return result.unit;
}
export const mappingKinds = ['DIRECT', 'DERIVED_CONFIRMED', 'UNRESOLVED'] satisfies MappingKind[];
