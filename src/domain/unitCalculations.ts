import type { DamageProfile, ExplosionProfile, Unit } from './unit';

function sumKnownDamage(base?: number, armorPiercing?: number): number | undefined {
  if (base === undefined || armorPiercing === undefined) return undefined;
  if (!Number.isFinite(base) || !Number.isFinite(armorPiercing)) return undefined;
  return base + armorPiercing;
}

// Bonuses are conditional and must not be included in unmodified weapon damage.
export const getTotalDamage = (damage?: DamageProfile) => sumKnownDamage(damage?.base, damage?.armorPiercing);
export const getMeleeWeaponDamage = (unit: Unit) => getTotalDamage(unit.melee.damage);
export const getMissileDirectDamage = (unit: Unit) => sumKnownDamage(unit.missile?.projectile.baseDamage, unit.missile?.projectile.armorPiercingDamage);
export const getExplosionDamage = (explosion?: ExplosionProfile) => sumKnownDamage(explosion?.baseDamage, explosion?.armorPiercingDamage);
