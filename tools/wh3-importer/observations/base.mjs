export function baseEntries({ root, land, weapon, armor, shield, rider, mountEntity }) {
  return [
    ['tier', root, 'tier'], ['entityCount', root, 'num_men'],
    ['customBattleCost', root, 'multiplayer_cost'], ['recruitmentCost', root, 'recruitment_cost'],
    ['upkeep', root, 'upkeep_cost'], ['recruitmentTurns', root, 'create_time'],
    ['armor', armor, 'armour_value'], ['shield', shield, 'missile_block_chance'],
    ['leadership', land, 'morale'], ['meleeAttack', land, 'melee_attack'],
    ['meleeDefense', land, 'melee_defence'], ['chargeBonus', land, 'charge_bonus'],
    ['baseDamage', weapon, 'damage'], ['apDamage', weapon, 'ap_damage'],
    ['bonusLarge', weapon, 'bonus_v_large'], ['bonusInfantry', weapon, 'bonus_v_infantry'],
    ['attackInterval', weapon, 'melee_attack_interval'], ['weaponLength', weapon, 'weapon_length'],
    ['splashMaxTargets', weapon, 'splash_attack_max_attacks'], ['splashTargetSize', weapon, 'splash_attack_target_size'],
    ['magicalAttack', weapon, 'is_magical'], ['bonusHitPoints', land, 'bonus_hit_points'],
    ['riderHitPoints', rider, 'hit_points'], ['riderMass', rider, 'mass'],
    ['riderSize', rider, 'size'], ['riderPenetrationResistance', rider, 'projectile_penetration_resistance'],
    ['mountHitPoints', mountEntity, 'hit_points'], ['mountMass', mountEntity, 'mass'],
    ['mountSize', mountEntity, 'size'], ['mountPenetrationResistance', mountEntity, 'projectile_penetration_resistance'],
    ['mountRunSpeed', mountEntity, 'run_speed'], ['mountChargeSpeed', mountEntity, 'charge_speed'],
    ['groundStatEffectGroup', land, 'ground_stat_effect_group'],
  ];
}
