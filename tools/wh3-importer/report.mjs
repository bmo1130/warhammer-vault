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
    { field: 'totalHealth', reason: 'Rider/mount hit_points and land bonus_hit_points are preserved. Their aggregation and unit-scale formula are unverified; no total calculated.' },
    { field: 'displaySpeed', reason: 'Raw run_speed/charge_speed retained. Conversion to displayed speed is unverified.' },
    { field: 'unitScale', reason: 'ground_stat_effect_group is a terrain group, not verified as displayed troop scale; entity size remains separate.' },
    { field: 'effectiveRecruitmentBuildings', reason: 'Building junction enabled/conditions/faction and raw building levels are retained. Effective eligibility and UI tier interpretation are unverified.' },
    { field: 'abilityEffects', reason: 'Ability membership and active/passive flags are traced. Effects and conditional campaign activation are outside this raw-source step.' },
    { field: 'runtimeOverrides', reason: 'Only explicitly opened CA DB/localisation packs are read. Runtime/balance/campaign overrides and load-order behavior have not been applied.' },
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
  lines.push('', '## Manual reference comparison', '', '**Manual reference values supplied by the user; never used to fill raw output.**', '', '| Observation | CA raw | Manual reference | Comparison |', '| --- | --- | --- | --- |');
  for (const [label, manual] of Object.entries(manualReference.values)) {
    const entry = entries.find((entry) => entry.label === label);
    const status = !entry || entry.status !== 'raw' ? 'unknown' : entry.value === manual ? 'same raw number' : 'raw value differs; verify version/units/semantics';
    lines.push(`| ${label} | ${entry?.status === 'raw' ? format(entry.value) : 'unknown'} | ${format(manual)} | ${status} |`);
  }
  lines.push('', 'Not directly compared (conversion/eligibility not verified):', '', ...Object.entries(manualReference.notDirectlyComparable).map(([label, value]) => `- Manual ${label}: ${format(value)}.`));
  lines.push('', '## Unresolved', '', ...dump.unresolved.map((issue) => `- ${issue.field}: ${issue.reason}`), '', `${dump.skippedReferences.length} outgoing references were deliberately left outside the bounded trace; raw rows and skippedReferences retain those keys.`, '', '## Data separation', '', '- This artifact: actual CA pack rows only when Data kind is ca-pack.', '- Tests: synthetic fixture data, separate from this output.', '- Manual reference: comparison input only, not extracted data.', '');
  return lines.join('\n');
}
