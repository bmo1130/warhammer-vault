export function missileEntries({ land, engine, engineEntity, missile, projectile, explosion, penetration }) {
  return [
    ['engineCount', land, 'num_engines'], ['primaryAmmo', land, 'primary_ammo'],
    ['landReload', land, 'reload'], ['landAccuracy', land, 'accuracy'],
    ['engineKey', engine, 'key'], ['engineType', engine, 'engine_type'],
    ['engineHitPoints', engineEntity, 'hit_points'], ['engineMass', engineEntity, 'mass'],
    ['engineSize', engineEntity, 'size'], ['engineRunSpeed', engineEntity, 'run_speed'],
    ['engineChargeSpeed', engineEntity, 'charge_speed'],
    ['enginePenetrationResistance', engineEntity, 'projectile_penetration_resistance'],
    ['missileWeaponKey', missile, 'key'], ['projectileKey', projectile, 'key'],
    ['range', projectile, 'effective_range'], ['minimumRange', projectile, 'minimum_range'],
    ['directBaseDamage', projectile, 'damage'], ['directApDamage', projectile, 'ap_damage'],
    ['shotsPerVolley', projectile, 'shots_per_volley'], ['projectileNumber', projectile, 'projectile_number'],
    ['burstSize', projectile, 'burst_size'], ['baseReloadTime', projectile, 'base_reload_time'],
    ['marksmanshipBonus', projectile, 'marksmanship_bonus'], ['spread', projectile, 'spread'],
    ['calibrationDistance', projectile, 'calibration_distance'], ['calibrationArea', projectile, 'calibration_area'],
    ['projectileCategory', projectile, 'category'], ['projectileShotType', projectile, 'shot_type'],
    ['explosionKey', explosion, 'key'], ['explosionBaseDamage', explosion, 'detonation_damage'],
    ['explosionApDamage', explosion, 'detonation_damage_ap'], ['explosionRadius', explosion, 'detonation_radius'],
    ['penetrationBudget', penetration, 'max_penetration'], ['penetrationStopSize', penetration, 'entity_size_cap'],
  ];
}
