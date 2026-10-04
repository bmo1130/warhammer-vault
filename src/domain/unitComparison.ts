import type { Unit } from './unit';
import { getMeleeWeaponDamage } from './unitCalculations';

type Value = number | string | undefined;
export type ComparisonRow = { label: string; left: Value; right: Value; delta?: number };
export const formatComparisonValue = (value: Value) => value === undefined ? '—' : String(value);

// Stored base fields only. A difference describes magnitude, never unit quality.
export function compareUnits(left: Unit, right: Unit): ComparisonRow[] {
  const rows: [string, (unit: Unit) => Value][] = [
    ['분류', u => u.classification.category], ['티어', u => u.classification.tier],
    ['장갑', u => u.defense.armor], ['근접 방어', u => u.defense.meleeDefense],
    ['리더십', u => u.defense.leadership], ['방패 방어 확률 (%)', u => u.defense.shieldBlockChance],
    ['방벽', u => u.defense.barrier],
    ['물리 저항 (%)', u => u.defense.resistances?.physical],
    ['사격 저항 (%)', u => u.defense.resistances?.missile],
    ['주문 저항 (%)', u => u.defense.resistances?.spell],
    ['화염 저항 (%)', u => u.defense.resistances?.fire],
    ['와드 저항 (%)', u => u.defense.resistances?.ward],
    ['근접 공격', u => u.melee.meleeAttack], ['돌격 보너스', u => u.melee.chargeBonus],
    ['기본 무기 피해', u => u.melee.damage.base], ['관통 무기 피해', u => u.melee.damage.armorPiercing],
    ['총 무기 피해', getMeleeWeaponDamage], ['대형 보너스', u => u.melee.damage.bonusVsLarge],
    ['보병 보너스', u => u.melee.damage.bonusVsInfantry],
    ['공격 주기 (초)', u => u.melee.attackInterval], ['무기 길이', u => u.melee.weaponLength],
    ['총 생명력 (ULTRA)', u => u.entities.totalHealth], ['개체 수', u => u.entities.count],
    ['개체 크기', u => u.entities.entitySize], ['질량', u => u.entities.mass], ['속도', u => u.movement.speed],
    ['커스텀 전투 비용', u => u.customBattle?.cost], ['캠페인 모집비', u => u.campaign?.recruitmentCost],
    ['유지비', u => u.campaign?.upkeep], ['모집 턴', u => u.campaign?.recruitmentTurns],
  ];
  return rows.map(([label, read]) => {
    const a = read(left), b = read(right);
    return { label, left: a, right: b, delta: typeof a === 'number' && typeof b === 'number' && Number.isFinite(a) && Number.isFinite(b) ? a - b : undefined };
  });
}
