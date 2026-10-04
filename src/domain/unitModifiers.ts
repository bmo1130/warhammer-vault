import type { Unit, UnitStatPath } from './unit';
import type { Modifier } from './types';

// Callers supply an already selected list. Effect scope/conditions are not
// resolved here. multiply.value is percentage points, not a raw multiplier.
export type UnitStatModifier = Pick<Modifier, 'id' | 'stat' | 'operation' | 'value'>;
export type ModifierBreakdown = {
  stat: UnitStatPath; base?: number; set?: number; flat: number; percent: number;
  result?: number; status: 'applied' | 'unknown'; modifiers: UnitStatModifier[];
};

// Complete UnitStatPath whitelist, also enforced at runtime for untyped input.
// No arbitrary property writes, strings, flags, arrays or derived totals.
const paths = {
  'entities.count': true, 'entities.totalHealth': true, 'entities.healthPerEntity': true, 'entities.mass': true,
  'movement.speed': true, 'movement.groundSpeed': true, 'movement.chargeSpeed': true,
  'defense.armor': true, 'defense.meleeDefense': true, 'defense.leadership': true,
  'defense.shieldBlockChance': true, 'defense.barrier': true, 'defense.projectilePenetrationResistance': true,
  'defense.resistances.physical': true, 'defense.resistances.missile': true,
  'defense.resistances.spell': true, 'defense.resistances.fire': true, 'defense.resistances.ward': true,
  'melee.meleeAttack': true, 'melee.chargeBonus': true, 'melee.attackInterval': true, 'melee.weaponLength': true,
  'melee.damage.base': true, 'melee.damage.armorPiercing': true, 'melee.damage.bonusVsLarge': true,
  'melee.damage.bonusVsInfantry': true, 'melee.splash.maxTargets': true,
  'missile.ammunition': true, 'missile.range': true,
  'missile.projectile.baseDamage': true, 'missile.projectile.armorPiercingDamage': true,
  'missile.projectile.bonusVsLarge': true, 'missile.projectile.bonusVsInfantry': true, 'missile.projectile.shotsPerVolley': true,
  'missile.projectile.penetration.resistanceBudget': true, 'missile.projectile.penetration.maxPenetrations': true,
  'missile.explosion.baseDamage': true, 'missile.explosion.armorPiercingDamage': true, 'missile.explosion.radius': true,
  'missile.accuracy.calibrationDistance': true, 'missile.accuracy.accuracy': true, 'missile.accuracy.calibrationArea': true,
  'missile.reload.baseTime': true, 'missile.reload.reloadSkill': true,
  'campaign.recruitmentCost': true, 'campaign.upkeep': true, 'campaign.recruitmentTurns': true, 'campaign.unitCap': true,
  'customBattle.cost': true,
} satisfies Record<UnitStatPath, true>;

function assertPath(stat: UnitStatPath) {
  if (!Object.hasOwn(paths, stat)) throw new Error(`Invalid numeric UnitStatPath: ${stat}`);
}

export function getStatValue(unit: Unit, stat: UnitStatPath): number | undefined {
  assertPath(stat);
  let value: unknown = unit;
  for (const key of stat.split('.')) {
    if (value === undefined) return undefined;
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid stat container: ${stat}`);
    value = Object.hasOwn(value, key) ? (value as Record<string, unknown>)[key] : undefined;
  }
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid numeric base: ${stat}`);
  return value;
}

// Only called for a known existing numeric field on the cloned Unit.
function writeStat(unit: Unit, stat: UnitStatPath, value: number) {
  const keys = stat.split('.');
  let target = unit as unknown as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
  target[keys[keys.length - 1]] = value;
}

export function applyModifiersWithBreakdown(baseUnit: Unit, modifiers: readonly UnitStatModifier[]): { unit: Unit; breakdown: ModifierBreakdown[] } {
  const ids = new Set<string>();
  const groups = new Map<UnitStatPath, UnitStatModifier[]>();
  for (const modifier of modifiers) {
    assertPath(modifier.stat);
    if (!modifier.id || typeof modifier.id !== 'string' || ids.has(modifier.id)) throw new Error('Modifier IDs must be nonempty and unique');
    if (!['set', 'add', 'multiply'].includes(modifier.operation) || typeof modifier.value !== 'number' || !Number.isFinite(modifier.value)) throw new Error(`Invalid modifier: ${modifier.id}`);
    ids.add(modifier.id);
    const group = groups.get(modifier.stat) ?? [];
    group.push({ id: modifier.id, stat: modifier.stat, operation: modifier.operation, value: modifier.value });
    groups.set(modifier.stat, group);
  }
  const unit = structuredClone(baseUnit);
  const breakdown: ModifierBreakdown[] = [];
  for (const stat of [...groups.keys()].sort()) {
    // Canonical ID order also fixes floating point summation order.
    const group = groups.get(stat)!.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const sets = group.filter(m => m.operation === 'set');
    if (sets.some(m => m.value !== sets[0].value)) throw new Error(`Conflicting SET modifiers: ${stat}`);
    const set = sets[0]?.value;
    const flat = group.filter(m => m.operation === 'add').reduce((sum, m) => sum + m.value, 0);
    const percent = group.filter(m => m.operation === 'multiply').reduce((sum, m) => sum + m.value, 0);
    if (!Number.isFinite(flat) || !Number.isFinite(percent)) throw new Error(`Modifier sum overflow: ${stat}`);
    const base = getStatValue(baseUnit, stat);
    const result = base === undefined ? undefined : ((set ?? base) + flat) * (1 + percent / 100);
    if (result !== undefined && !Number.isFinite(result)) throw new Error(`Modifier result overflow: ${stat}`);
    if (result !== undefined) writeStat(unit, stat, result);
    breakdown.push({ stat, base, set, flat, percent, result, status: base === undefined ? 'unknown' : 'applied', modifiers: group });
  }
  return { unit, breakdown };
}

export const applyModifiers = (baseUnit: Unit, modifiers: readonly UnitStatModifier[]): Unit => applyModifiersWithBreakdown(baseUnit, modifiers).unit;
