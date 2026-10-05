import type { SourceInfo } from './types';

export const entitySizes = ['tiny', 'small', 'medium', 'large', 'very_large'] as const;
export type EntitySize = typeof entitySizes[number];
// Displayed troop scale, independent of an individual entity's collision size.
export type UnitScale = 'small' | 'large';

// Stable IDs (lowercase snake_case), with localized labels kept separately.
export type UnitAbilityId = string;
export type UnitAttributeId = string;
export type AttackAttributeId = string;

export type UnitClassification = { category: string; role?: string; tier?: number };
export type UnitEntities = {
  // Unknown in current samples; never fill with a fabricated count or zero.
  count?: number;
  unitScale?: UnitScale;
  entitySize?: EntitySize;
  totalHealth?: number;
  // Only store if independently sourced, rather than calculated from the total.
  healthPerEntity?: number;
  mass?: number;
  splashTargetingClass?: string;
  receivesSplashAlone?: boolean;
};
// Structured movement state is the source of truth. Do not also emit
// can_fly/cannot_run/can_skirmish as generic attribute IDs.
export type UnitMovement = {
  speed?: number;
  groundSpeed?: number;
  chargeSpeed?: number;
  canFly?: boolean;
  canRun?: boolean;
  canSkirmish?: boolean;
};
// Percentages use percentage points: 20 means 20%, rather than 0.2.
export type UnitResistances = {
  physical?: number;
  missile?: number;
  spell?: number;
  fire?: number;
  ward?: number;
};
export type UnitDefense = {
  armor?: number;
  meleeDefense?: number;
  leadership?: number;
  shieldBlockChance?: number;
  barrier?: number;
  resistances?: UnitResistances;
  projectilePenetrationResistance?: number;
};
export type DamageProfile = {
  base?: number;
  armorPiercing?: number;
  bonusVsLarge?: number;
  bonusVsInfantry?: number;
};
export type MeleeSplash = { maxTargets?: number; maxTargetSize?: EntitySize };
export type UnitMelee = {
  meleeAttack?: number;
  chargeBonus?: number;
  damage: DamageProfile;
  attackInterval?: number;
  weaponLength?: number;
  splash?: MeleeSplash;
  attackAttributes?: AttackAttributeId[];
};
export type ProjectilePenetration = {
  // A resistance budget and a count of entities pierced are different raw values.
  // Do not convert either into the other without verifying the game DB semantics.
  resistanceBudget?: number;
  maxPenetrations?: number;
  stopsAtEntitySize?: EntitySize;
};
export type MissileAccuracy = { calibrationDistance?: number; accuracy?: number; calibrationArea?: number };
export type ExplosionProfile = { baseDamage?: number; armorPiercingDamage?: number; radius?: number };
// Seconds and the raw reload skill; no assumed formula for current reload time.
export type MissileReload = { baseTime?: number; reloadSkill?: number };
export type MissileProjectile = {
  baseDamage?: number;
  armorPiercingDamage?: number;
  bonusVsLarge?: number;
  bonusVsInfantry?: number;
  shotsPerVolley?: number;
  trajectory?: string;
  ignoresShields?: boolean;
  penetration?: ProjectilePenetration;
};
export type UnitMissile = {
  ammunition?: number;
  range?: number;
  projectile: MissileProjectile;
  explosion?: ExplosionProfile;
  accuracy?: MissileAccuracy;
  reload?: MissileReload;
};
export type TerrainModifier = {
  terrainId: string;
  // Signed percentage changes: -20 means a 20% reduction.
  speedPercent?: number;
  meleeAttackPercent?: number;
  meleeDefensePercent?: number;
};
export type UnitRecruitmentRequirement = {
  buildingId?: string;
  buildingTier?: number;
  factionId?: string;
  conditionIds?: string[];
};
export type UnitCampaignData = {
  recruitmentCost?: number;
  upkeep?: number;
  recruitmentTurns?: number;
  // OR between entries; AND between the conditions within each entry.
  recruitmentRequirements?: UnitRecruitmentRequirement[];
  unitCap?: number;
};
export type UnitCustomBattleData = { cost?: number };
export type UnitStrengthWeakness = { kind: 'strength' | 'weakness'; text: string };
// source is the entity-wide fallback; sources contains group-specific
// descriptions. Exact importer field provenance stays outside Unit.
export type UnitDataSources = { publicStats?: string; hiddenStats?: string; campaign?: string };

export type Unit = SourceInfo & {
  id: string;
  name: string;
  factionId: string;
  // Additional race catalogs, proved by exact faction permissions.
  factionIds?: string[];
  summary: string;
  classification: UnitClassification;
  entities: UnitEntities;
  movement: UnitMovement;
  defense: UnitDefense;
  melee: UnitMelee;
  // Absence means no verified missile data, not proof that the unit cannot shoot.
  missile?: UnitMissile;
  terrainModifiers?: TerrainModifier[];
  abilities?: UnitAbilityId[];
  passiveAbilities?: UnitAbilityId[];
  attributes?: UnitAttributeId[];
  campaign?: UnitCampaignData;
  customBattle?: UnitCustomBattleData;
  strengthsAndWeaknesses?: UnitStrengthWeakness[];
  sources?: UnitDataSources;
};

type NumericKey<T> = { [K in keyof T]-?: Exclude<T[K], undefined> extends number ? K : never }[keyof T] & string;
// Original numeric fields only. Future modifiers can refer to grouped stats
// without retaining a second, flat UnitStats model or targeting derived totals.
export type UnitStatPath =
  | `entities.${NumericKey<UnitEntities>}`
  | `movement.${NumericKey<UnitMovement>}`
  | `defense.${NumericKey<UnitDefense>}`
  | `defense.resistances.${NumericKey<UnitResistances>}`
  | `melee.${NumericKey<UnitMelee>}`
  | `melee.damage.${NumericKey<DamageProfile>}`
  | `melee.splash.${NumericKey<MeleeSplash>}`
  | `missile.${NumericKey<UnitMissile>}`
  | `missile.projectile.${NumericKey<MissileProjectile>}`
  | `missile.projectile.penetration.${NumericKey<ProjectilePenetration>}`
  | `missile.explosion.${NumericKey<ExplosionProfile>}`
  | `missile.accuracy.${NumericKey<MissileAccuracy>}`
  | `missile.reload.${NumericKey<MissileReload>}`
  | `campaign.${NumericKey<UnitCampaignData>}`
  | `customBattle.${NumericKey<UnitCustomBattleData>}`;
