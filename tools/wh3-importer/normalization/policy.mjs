import { readFileSync } from 'node:fs';

const findings = JSON.parse(readFileSync(new URL('../semantics-findings.json', import.meta.url), 'utf8'));
export const normalizationMode = 'conservative';
export const supportedGameVersion = findings.environment.gameProductVersion;

// Topic confirmation is scoped: confirmed override *paths* never authorize
// runtime stat calculations. No derived formula is approved in this release.
export const confirmedDerivations = Object.freeze({});
export function allowsDerived(topic, formulaId) {
  return findings.topics[topic]?.status === 'CONFIRMED' && confirmedDerivations[formulaId]?.topic === topic;
}

export const blockedMappings = [
  ['entities.totalHealth', 'totalHealth', 'HP aggregation and scaling are unverified.'],
  ['entities.healthPerEntity', 'totalHealth', 'Entity hit_points alone is not verified final per-entity health.'],
  ['entities.count', 'artillery', 'Displayed count policy is not implemented; num_men/num_engines remain raw facts.'],
  ['entities.unitScale', 'totalHealth', 'No verified displayed troop-scale mapping.'],
  ['movement.speed', 'displaySpeed', 'The x10 hypothesis is not CONFIRMED.'],
  ['movement.groundSpeed', 'displaySpeed', 'The x10 hypothesis is not CONFIRMED.'],
  ['movement.chargeSpeed', 'displaySpeed', 'Displayed charge-speed units/source selection are unverified.'],
  ['missile.ammunition', 'displayAmmo', 'Volley/display ammunition conversion is unverified.'],
  ['missile.accuracy.accuracy', 'accuracy', 'Combined displayed accuracy is unverified.'],
  ['missile.reload.reloadSkill', 'reloadTime', 'Raw reload reduction is not established as displayed reload skill.'],
  ['missile.reload.currentTime', 'reloadTime', 'No verified current-reload formula; not a stored Unit field.'],
  ['missile.strength', 'reloadTime', 'No verified missile-strength/DPS formula; not a stored Unit field.'],
  ['missile.projectile.ignoresShields', 'accuracy', 'A category description does not establish a universal shield-bypass flag.'],
  ['missile.projectile.penetration.maxPenetrations', 'artillery', 'Resistance budget must not be converted into pierced-entity count.'],
  ['defense.resistances', 'resistances', 'Raw-to-runtime resistance mapping is only STRONGLY SUPPORTED; no opt-in in conservative mode.'],
  ['campaign.recruitmentRequirements', 'recruitmentTier', 'Building stage/requirement/permissions do not establish effective availability.'],
  ['campaign.unitCap', 'runtimeOverrides', 'Raw cap sentinel/context semantics are not mapped.'],
  ['terrainModifiers', 'runtimeOverrides', 'Raw multiplier-to-percentage and active terrain semantics require a separate policy.'],
  ['melee.attackAttributes.flaming', 'flamingAttack', 'Numeric ignition_amount is retained; no verified boolean flaming mapping.'],
];

export const directMappings = [
  ['classification.tier', 'root', 'tier', 'integer'],
  ['defense.armor', 'armor', 'armour_value', 'number'],
  ['defense.meleeDefense', 'land', 'melee_defence', 'number'],
  ['defense.leadership', 'land', 'morale', 'number'],
  ['defense.shieldBlockChance', 'shield', 'missile_block_chance', 'number'],
  ['movement.canSkirmish', 'land', 'can_skirmish', 'boolean'],
  ['melee.meleeAttack', 'land', 'melee_attack', 'number'],
  ['melee.chargeBonus', 'land', 'charge_bonus', 'number'],
  ['melee.damage.base', 'weapon', 'damage', 'number'],
  ['melee.damage.armorPiercing', 'weapon', 'ap_damage', 'number'],
  ['melee.damage.bonusVsLarge', 'weapon', 'bonus_v_large', 'number'],
  ['melee.damage.bonusVsInfantry', 'weapon', 'bonus_v_infantry', 'number'],
  ['melee.attackInterval', 'weapon', 'melee_attack_interval', 'number'],
  ['melee.weaponLength', 'weapon', 'weapon_length', 'number'],
  ['melee.splash.maxTargets', 'weapon', 'splash_attack_max_attacks', 'integer'],
  ['melee.splash.maxTargetSize', 'weapon', 'splash_attack_target_size', 'size'],
  ['missile.range', 'projectile', 'effective_range', 'number'],
  ['missile.projectile.baseDamage', 'projectile', 'damage', 'number'],
  ['missile.projectile.armorPiercingDamage', 'projectile', 'ap_damage', 'number'],
  ['missile.projectile.bonusVsLarge', 'projectile', 'bonus_v_large', 'number'],
  ['missile.projectile.bonusVsInfantry', 'projectile', 'bonus_v_infantry', 'number'],
  ['missile.projectile.shotsPerVolley', 'projectile', 'shots_per_volley', 'integer'],
  ['missile.explosion.baseDamage', 'explosion', 'detonation_damage', 'number'],
  ['missile.explosion.armorPiercingDamage', 'explosion', 'detonation_damage_ap', 'number'],
  ['missile.explosion.radius', 'explosion', 'detonation_radius', 'number'],
  ['missile.accuracy.calibrationDistance', 'projectile', 'calibration_distance', 'number'],
  ['missile.accuracy.calibrationArea', 'projectile', 'calibration_area', 'number'],
  ['missile.reload.baseTime', 'projectile', 'base_reload_time', 'number'],
  ['missile.projectile.penetration.resistanceBudget', 'penetration', 'max_penetration', 'number'],
  ['missile.projectile.penetration.stopsAtEntitySize', 'penetration', 'entity_size_cap', 'size'],
  ['customBattle.cost', 'root', 'multiplayer_cost', 'number'],
  ['campaign.recruitmentCost', 'root', 'recruitment_cost', 'number'],
  ['campaign.upkeep', 'root', 'upkeep_cost', 'number'],
  ['campaign.recruitmentTurns', 'root', 'create_time', 'integer'],
];

export const topicStatus = (topic) => findings.topics[topic]?.status ?? 'UNRESOLVED';
