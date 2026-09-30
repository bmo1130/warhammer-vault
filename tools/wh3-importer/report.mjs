// Presentation only. Compatibility exports preserve existing callers.
export { observations } from './observations/index.mjs';
export { addObservationUnresolved } from './observations/uncertainty.mjs';

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
  lines.push('', '## Manual reference comparison', '', manualReference.sourceKind === 'not-provided' ? '**No independent manual/UI reference was supplied for this research sample.**' : '**Manual reference values supplied by the user; never used to fill raw output.**', '', '| Observation | CA raw | Manual reference | Comparison |', '| --- | --- | --- | --- |');
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
