import type { Unit } from './unit';
import { applyModifiersWithBreakdown, modifierStatPaths, type UnitStatModifier, type ModifierBreakdown } from './unitModifiers';

export type ManualModifierProfile = {
  id: string; name: string; unitId: string; modifiers: UnitStatModifier[];
  createdAt: string; updatedAt: string;
};
export type DraftModifierRow = Omit<UnitStatModifier, 'value'> & { value: string };

export function calculateManualModifiers(unit: Unit, rows: readonly DraftModifierRow[]): { unit?: Unit; breakdown: ModifierBreakdown[]; modifiers: UnitStatModifier[]; error: string } {
  try {
    const modifiers = rows.map(row => {
      if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(row.value.trim()) || !Number.isFinite(Number(row.value))) throw new Error('값에 유한한 숫자를 입력하세요. 빈 값은 적용하지 않습니다.');
      return { ...row, value: Number(row.value) };
    });
    return { ...applyModifiersWithBreakdown(unit, modifiers), modifiers, error: '' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : '잘못된 Modifier 입력입니다.';
    return { breakdown: [], modifiers: [], error: detail.startsWith('Conflicting SET') ? '같은 스탯에 서로 다른 SET 값이 있습니다. 해당 행을 수정하거나 삭제하세요.' : detail };
  }
}

export function parseManualModifierProfile(raw: unknown, getUnit: (id: string) => Unit | undefined): ManualModifierProfile {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('손상된 수동 Profile입니다.');
  const p = raw as Record<string, unknown>;
  if (['id', 'name', 'unitId', 'createdAt', 'updatedAt'].some(key => typeof p[key] !== 'string' || !(p[key] as string).trim()) || !Array.isArray(p.modifiers)) throw new Error('손상된 수동 Profile입니다.');
  if (!Number.isFinite(Date.parse(p.createdAt as string)) || !Number.isFinite(Date.parse(p.updatedAt as string))) throw new Error('Profile의 날짜가 유효하지 않습니다.');
  const unit = getUnit(p.unitId as string);
  if (!unit) throw new Error('Profile의 Production 유닛 ID를 찾을 수 없습니다.');
  const modifiers = p.modifiers.map(rawModifier => {
    if (!rawModifier || typeof rawModifier !== 'object' || Array.isArray(rawModifier)) throw new Error('손상된 Modifier입니다.');
    const m = rawModifier as UnitStatModifier;
    if (!modifierStatPaths.includes(m.stat)) throw new Error('Profile에 잘못된 stat 경로가 있습니다.');
    return { id: m.id, stat: m.stat, operation: m.operation, value: m.value };
  });
  applyModifiersWithBreakdown(unit, modifiers);
  return { id: p.id as string, name: (p.name as string).trim(), unitId: unit.id, modifiers, createdAt: p.createdAt as string, updatedAt: p.updatedAt as string };
}
