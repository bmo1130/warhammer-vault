import projection from '../data/caResearchEffect.json';
import type { Modifier } from './types';
import type { Unit } from './unit';
import { calculateManualModifiers, type DraftModifierRow } from './manualModifierProfile';
import { applyModifiersWithBreakdown } from './unitModifiers';

// One committed, reviewed slice. Applicability was resolved by the importer;
// the numerical engine does not resolve campaign scopes or CA unit sets.
export const caResearchEffect = projection;
export function researchAvailable(unit: Unit): boolean {
  return unit.id === projection.unitId && unit.gameVersion === projection.gameVersion;
}
export function researchModifiers(unit: Unit): Modifier[] {
  if (!researchAvailable(unit)) throw new Error('이 연구의 검증된 exact 유닛/버전과 일치하지 않습니다.');
  return structuredClone(projection.modifiers) as Modifier[];
}
export function modifierSourceLabel(id: string, researchSelected: boolean): string {
  return researchSelected && projection.modifiers.some(m => m.id === id) ? `WH3 Research · ${projection.name}` : 'Manual';
}
export function calculateResearchAndManual(unit: Unit, rows: readonly DraftModifierRow[], selected: boolean): ReturnType<typeof calculateManualModifiers> {
  const manual = calculateManualModifiers(unit, rows);
  if (manual.error || !selected) return manual;
  try {
    // Return manual modifiers separately so saving a personal Profile cannot
    // silently persist source-controlled research as editable manual rows.
    return { ...applyModifiersWithBreakdown(unit, [...manual.modifiers, ...researchModifiers(unit)]), modifiers: manual.modifiers, error: '' };
  } catch (error) {
    return { modifiers: [], breakdown: [], error: error instanceof Error ? error.message : '연구를 적용하지 못했습니다.' };
  }
}
