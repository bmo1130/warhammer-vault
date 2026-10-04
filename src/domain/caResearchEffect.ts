import projection from '../data/caResearchEffect.json';
import type { Modifier } from './types';
import type { Unit } from './unit';
import { calculateManualModifiers, type DraftModifierRow } from './manualModifierProfile';
import { applyModifiersWithBreakdown } from './unitModifiers';

// Technology metadata is stored once. Materialize the bounded reviewed contexts
// once at module load; neither renders nor the engine read raw importer evidence.
export const caResearchEffects = projection.technologies.flatMap(technology =>
  projection.targets.flatMap(target => {
    const admitted = projection.modifiers.filter(m => m.unitId === target.unitId &&
      projection.effects.some(e => e.id === m.effectId && e.technologyKey === technology.key));
    if (!admitted.length) return [];
    return [{ ...target, researchKey: technology.key, name: technology.name,
      partial: technology.partial, omittedEffects: technology.omittedEffects,
      sourceKind: projection.sourceKind, gameVersion: projection.provenance.gameVersion,
      sourceSha256: projection.provenance.sourceSha256, snapshotId: projection.provenance.snapshotId,
      scope: projection.effects.find(e => e.id === admitted[0].effectId)!.scope,
      modifiers: admitted.map(m => {
        const effect = projection.effects.find(e => e.id === m.effectId)!;
        return { id: m.id, sourceType: 'research', sourceId: technology.key,
          targetType: 'unit', targetId: target.unitId, stat: m.stat, operation: m.operation,
          value: m.value, scope: 'faction', gameVersion: projection.provenance.gameVersion,
          source: `CA_RESEARCH · ${effect.effectKey}`, tags: [] };
      }) }];
  })
);
export function researchesForUnit(unit: Unit) {
  return caResearchEffects.filter(p => unit.id === p.unitId && unit.gameVersion === p.gameVersion);
}
export function researchModifiers(unit: Unit, selected: readonly string[]): Modifier[] {
  if (new Set(selected).size !== selected.length) throw new Error('중복된 연구 선택입니다.');
  const available = researchesForUnit(unit);
  return selected.slice().sort().flatMap(key => {
    const matches = available.filter(p => p.researchKey === key);
    if (matches.length !== 1) throw new Error('이 연구의 검증된 exact 유닛/버전과 일치하지 않습니다.');
    return structuredClone(matches[0].modifiers) as Modifier[];
  });
}
export function modifierSourceLabel(id: string, selected: readonly string[]): string {
  const research = caResearchEffects.find(p => selected.includes(p.researchKey) && p.modifiers.some(m => m.id === id));
  return research ? `WH3 Research · ${research.name}` : 'Manual';
}
export function calculateResearchAndManual(unit: Unit, rows: readonly DraftModifierRow[], selected: readonly string[]): ReturnType<typeof calculateManualModifiers> {
  const manual = calculateManualModifiers(unit, rows);
  if (manual.error || !selected.length) return manual;
  try {
    // Return manual modifiers separately so saving a personal Profile cannot
    // silently persist source-controlled research as editable manual rows.
    return { ...applyModifiersWithBreakdown(unit, [...manual.modifiers, ...researchModifiers(unit, selected)]), modifiers: manual.modifiers, error: '' };
  } catch (error) {
    return { modifiers: [], breakdown: [], error: error instanceof Error ? error.message : '연구를 적용하지 못했습니다.' };
  }
}
