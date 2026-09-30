export function addObservationUnresolved(dump, entries) {
  for (const entry of entries.filter((entry) => entry.status === 'unresolved')) dump.unresolved.push({ field: entry.label, reason: 'Source row or expected named field is missing; no substitute value used.' });
  dump.unresolved.push(
    { field: 'totalHealth', reason: 'Raw man_entity/mount/engine hit_points and land bonus_hit_points are preserved where linked. Their aggregation and unit-scale formula are unverified; no total calculated.' },
    { field: 'displaySpeed', reason: 'Raw run_speed/charge_speed retained. Conversion to displayed speed is unverified.' },
    { field: 'unitScale', reason: 'ground_stat_effect_group is a terrain group, not verified as displayed troop scale; entity size remains separate.' },
    { field: 'effectiveRecruitmentBuildings', reason: 'Building junction enabled/conditions/faction and raw building levels are retained. Effective eligibility and UI tier interpretation are unverified.' },
    { field: 'abilityEffects', reason: 'Ability membership and active/passive flags are traced. Profile-scoped phase effects, when present, remain raw; activation and final stat application are unverified.' },
    { field: 'runtimeOverrides', reason: 'Only explicitly opened CA DB/localisation packs are read. Runtime/balance/campaign overrides and load-order behavior have not been applied.' },
  );
  if (dump.discovery?.profile === 'helstorm') dump.unresolved.push(
    { field: 'artilleryCrewCount', reason: 'num_men, num_engines and separate man_entity/engine battle_entity are raw evidence. Crew allocation, reserve crew and scaling are not derived from engine_type or a guessed ratio.' },
    { field: 'displayedAmmunition', reason: 'primary_ammo and shots_per_volley are separate raw fields. No division is performed to force the manual ammunition value.' },
    { field: 'currentReloadTime', reason: 'land reload and projectile base_reload_time are preserved. Reload skill/animation rules are unverified; no 15.3 calculation.' },
    { field: 'displayedAccuracy', reason: 'land accuracy, projectile marksmanship_bonus, calibration_distance and calibration_area remain separate. No combined UI accuracy calculated.' },
    { field: 'shieldInteraction', reason: 'Projectile category and its processed schema description are evidence about shields. No universal shield bypass boolean is inferred or normalized.' },
  );
  if (dump.discovery?.profile === 'bloodthirster') dump.unresolved.push(
    { field: 'resistanceSemantics', reason: 'damage_mod_magic schema describes magical damage; correspondence to current displayed spell resistance is unverified. Base modifiers and ability phase effects remain separate; no final resistance computed.' },
    { field: 'abilityActivation', reason: 'Raw ability/phase/behaviour membership and values are traced, including Wounds. Activation thresholds, Daemonic Instability/Banishment display semantics and runtime rules are not inferred from names or order.' },
  );
}

