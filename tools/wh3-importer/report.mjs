// Reports select original named fields and keep explicit provenance. They do
// not create normalized Unit data or calculate UI totals/conversion formulas.
export function observations(dump) {
  const byId = new Map(dump.rows.map((record) => [record.id, record]));
  const root = byId.get(dump.rootRow);
  const follow = (record, field) => {
    const targets = dump.relationships.filter((edge) => edge.from === record?.id && edge.field === field && edge.direction === 'forward').map((edge) => byId.get(edge.to));
    return targets.length === 1 ? targets[0] : undefined;
  };
  const land = follow(root, 'land_unit');
  const weapon = follow(land, 'primary_melee_weapon');
  const armor = follow(land, 'armour');
  const shield = follow(land, 'shield');
  const rider = follow(land, 'man_entity');
  const mount = follow(land, 'mount');
  const mountEntity = follow(mount, 'entity');
  const engine = follow(land, 'engine');
  const engineEntity = follow(engine, 'battle_entity');
  const missile = follow(engine, 'missile_weapon') ?? follow(land, 'primary_missile_weapon');
  const projectile = follow(missile, 'default_projectile');
  const explosion = follow(projectile, 'explosion_type');
  const penetration = follow(projectile, 'projectile_penetration');
  const entries = [
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
  if (dump.discovery?.profile !== 'grail-knights' && dump.discovery?.profile) {
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
  if (dump.discovery?.profile === 'helstorm') entries.push(
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
  );
  return entries.map(([label, record, field]) => ({
    label,
    value: record && Object.hasOwn(record.row, field) ? record.row[field] : null,
    status: record && Object.hasOwn(record.row, field) ? 'raw' : 'unresolved',
    source: record ? { rowId: record.id, table: record.table, path: record.path, key: record.key, field } : null,
  }));
}

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

const format = (value) => JSON.stringify(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
export function renderSummary(dump, entries, manualReference) {
  const lines = [
    `# ${dump.unit.displayName} — raw source inspection`, '',
    `Data kind: **${dump.sourceKind}**`,
    `CA key: \`${dump.unit.caKey}\``,
    `Game version: \`${dump.unit.gameVersion}\` (${dump.provenance.gameVersionSource ?? 'unknown'})`,
    `RPFM: \`${dump.provenance.rpfmVersion ?? 'unknown'}\`; schema format: \`${dump.provenance.schemaFormatVersion ?? 'unknown'}\``,
    `Extracted: ${dump.unit.extractedAt}`, '',
    'Values below are raw DB fields. No UI conversion, derived totals, or wiki corrections have been applied.', '',
    '| Observation | Raw value | Source table / field | Row key |', '| --- | --- | --- | --- |',
    ...entries.map((entry) => `| ${entry.label} | ${entry.status === 'raw' ? format(entry.value) : 'unknown'} | ${entry.source ? `${entry.source.table}.${entry.source.field}` : 'unresolved'} | ${entry.source ? format(entry.source.key) : 'unknown'} |`),
    '', '## Tables read', '',
    ...[...new Set(dump.rows.map((record) => `${record.sourcePack}: ${record.path} (table v${record.tableVersion})`))].map((path) => `- ${path}`),
    '', '## Original relation trace', '',
  ];
  if (dump.discovery) lines.splice(10, 0,
    '## Root discovery', '', `Explicit profile policy: \`${dump.discovery.policy}\`. Ambiguity after policy is an error.`, '',
    '| Main key | Land key | Raw recruitment cost | Policy accepted |', '| --- | --- | --- | --- |',
    ...dump.discovery.candidates.map((candidate) => `| ${candidate.mainKey} | ${candidate.landKey} | ${format(candidate.recruitmentCost)} | ${candidate.selectedByPolicy} |`), '',
  );
  const byId = new Map(dump.rows.map((record) => [record.id, record]));
  for (const edge of dump.relationships) {
    const from = byId.get(edge.from), to = byId.get(edge.to);
    lines.push(`- ${from.table} ${format(from.key)} .${edge.field} → ${to.table} ${format(to.key)} .${edge.targetField} = ${format(edge.value)} (${edge.direction})`);
  }
  for (const table of ['unit_attributes_to_groups_junctions_tables', 'land_units_to_unit_abilites_junctions_tables', 'unit_abilities_tables', 'unit_special_abilities_tables', 'building_units_allowed_tables', 'building_levels_tables', 'ground_type_to_stat_effects_tables']) {
    lines.push('', `## ${table}`, '');
    for (const record of dump.rows.filter((row) => row.table === table)) {
      const relevant = table === 'unit_special_abilities_tables' ? { key: record.row.key, passive: record.row.passive } : table === 'building_levels_tables' ? { level_name: record.row.level_name, level: record.row.level, primary_slot_building_building_level_requirement: record.row.primary_slot_building_building_level_requirement } : record.row;
      lines.push(`- ${format(relevant)} (row ${record.id})`);
    }
  }
  for (const table of ['battlefield_engines_tables', 'special_ability_to_special_ability_phase_junctions_tables', 'special_ability_phases_tables', 'special_ability_phase_stat_effects_tables', 'special_ability_phase_attribute_effects_tables', 'special_ability_behaviour_groups_tables', 'special_ability_behaviour_groups_to_types_tables']) {
    const records = dump.rows.filter((row) => row.table === table);
    if (!records.length) continue;
    lines.push('', `## ${table}`, '', ...records.map((record) => `- ${format(record.row)} (row ${record.id})`));
  }
  lines.push('', '## Schema evidence (descriptions are not calculations)', '');
  const descriptions = new Set();
  for (const entry of entries.filter((entry) => entry.status === 'raw')) {
    const field = dump.schemas.find((schema) => schema.table === entry.source.table && schema.version === byId.get(entry.source.rowId).tableVersion)?.fields.find((field) => field.name === entry.source.field);
    if (field?.description) descriptions.add(`- ${entry.source.table}.${field.name}: ${field.description.replaceAll('\n', ' ')}`);
  }
  lines.push(...descriptions);
  lines.push('', '## Manual reference comparison', '', '**Manual reference values supplied by the user; never used to fill raw output.**', '', '| Observation | CA raw | Manual reference | Comparison |', '| --- | --- | --- | --- |');
  for (const [label, manual] of Object.entries(manualReference.values)) {
    const entry = entries.find((entry) => entry.label === label);
    const status = !entry || entry.status !== 'raw' ? 'unknown' : entry.value === manual ? 'same raw number' : 'raw value differs; verify version/units/semantics';
    lines.push(`| ${label} | ${entry?.status === 'raw' ? format(entry.value) : 'unknown'} | ${format(manual)} | ${status} |`);
  }
  const comparisonEvidence = {
    totalHealth: ['bonusHitPoints', 'riderHitPoints', 'mountHitPoints', 'manEntityHitPoints', 'engineHitPoints', 'entityCount', 'engineCount'],
    displaySpeed: ['mountRunSpeed', 'engineRunSpeed', 'manEntityRunSpeed'],
    displayFlySpeed: ['manEntityFlySpeed'], displayGroundSpeed: ['manEntityRunSpeed'],
    ammunition: ['primaryAmmo', 'shotsPerVolley'], displayedEntityCount: ['entityCount', 'engineCount'],
    accuracy: ['landAccuracy', 'marksmanshipBonus', 'calibrationDistance', 'calibrationArea'],
    reloadSkill: ['landReload'], currentReloadTime: ['landReload', 'baseReloadTime'],
    mass: ['engineMass', 'manEntityMass'], entitySize: ['engineSize', 'manEntitySize'],
    spellResistance: ['damageModMagic'], unitScale: ['groundStatEffectGroup'],
    shieldInteraction: ['projectileCategory'],
  };
  lines.push('', 'Not directly compared (conversion/eligibility not verified):', '');
  for (const [label, value] of Object.entries(manualReference.notDirectlyComparable)) {
    const evidence = (comparisonEvidence[label] ?? []).map((name) => entries.find((entry) => entry.label === name)).filter((entry) => entry?.status === 'raw');
    lines.push(`- Manual ${label}: ${format(value)}. Raw evidence: ${evidence.length ? evidence.map((entry) => `${entry.label}=${format(entry.value)}`).join(', ') : 'not resolved'}. Status: conversion/semantics unresolved.`);
  }
  lines.push('', '## Unresolved', '', ...dump.unresolved.map((issue) => `- ${issue.field}: ${issue.reason}`), '', `${dump.skippedReferences.length} outgoing references were deliberately left outside the bounded trace; raw rows and skippedReferences retain those keys.`, '', '## Data separation', '', '- This artifact: actual CA pack rows only when Data kind is ca-pack.', '- Tests: synthetic fixture data, separate from this output.', '- Manual reference: comparison input only, not extracted data.', '');
  return lines.join('\n');
}
