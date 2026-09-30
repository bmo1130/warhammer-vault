export function addEntityEntries(entries, { root, land, weapon, rider }) {
  // The same man_entity relation points to crew or a monster, not a rider.
  for (let index = entries.length - 1; index >= 0; index--) {
    if (entries[index][0].startsWith('mount')) entries.splice(index, 1);
    else if (entries[index][0].startsWith('rider')) entries[index][0] = entries[index][0].replace('rider', 'manEntity');
  }
  entries.push(
    ['manEntityRunSpeed', rider, 'run_speed'], ['manEntityChargeSpeed', rider, 'charge_speed'],
    ['manEntityFlySpeed', rider, 'fly_speed'], ['manEntityFlyingChargeSpeed', rider, 'flying_charge_speed'],
    ['damageModPhysical', land, 'damage_mod_physical'], ['damageModMagic', land, 'damage_mod_magic'],
    ['damageModFlame', land, 'damage_mod_flame'], ['damageModMissile', land, 'damage_mod_missile'],
    ['damageModAll', land, 'damage_mod_all'], ['ignitionAmount', weapon, 'ignition_amount'],
    ['canSiege', root, 'can_siege'], ['canSkirmish', land, 'can_skirmish'],
  );
}
