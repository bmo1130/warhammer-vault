import type { AttackAttributeId, UnitAbilityId, UnitAttributeId } from './unit';
import attributeAdmissions from '../data/unitAttributeAdmissions.json';

// These are display labels, not canonical game DB IDs. Importers must map
// verified source IDs to these app IDs, or supply additional labels.
const legacyAttributeLabels: Readonly<Record<UnitAttributeId, string>> = {
  perfect_vigour: '완벽한 활력',
  immune_to_psychology: '심리 면역',
  stalk_in_forest: '은신 (숲)',
  causes_fear: '공포 유발',
  causes_terror: '섬뜩함 유발',
  can_fly: '비행 가능',
  knight: '기사',
  daemon: '악마',
  daemonic_instability: '악마의 불안정성',
  banishment: '추방',
  siege_attacker: '공성 공격자',
  cannot_run: '질주 불가',
  // Exact saved CA localisation; candidate-scoped aliases, no effect formulas.
  charge_defense_vs_large: 'Charge Defence vs. Large',
  charge_reflection: 'Charge Reflection',
  charge_defense: 'Expert Charge Defence',
  undead: 'Undead',
};
// Exact CA Korean titles of admitted native attributes; IDs stay unchanged.
export const unitAttributeLabels: Readonly<Record<UnitAttributeId, string>> = { ...legacyAttributeLabels, ...attributeAdmissions.labels };
export const attackAttributeLabels: Readonly<Record<AttackAttributeId, string>> = { magical: '마법 공격', flaming: '화염 공격' };
export const unitAbilityLabels: Readonly<Record<UnitAbilityId, string>> = { lance: '랜스', blessing_of_the_lady: '여제의 축복', wounds: '부상', daemonic_instability: '악마의 불안정성', banished: '추방됨', regeneration: 'Regeneration', crumbling: 'Crumbling', disintegrating: 'Disintegrating' };

export const getUnitAttributeLabel = (id: UnitAttributeId) => unitAttributeLabels[id] ?? id;
export const getAttackAttributeLabel = (id: AttackAttributeId) => attackAttributeLabels[id] ?? id;
export const getUnitAbilityLabel = (id: UnitAbilityId) => unitAbilityLabels[id] ?? id;
