import { connected, rawFact, requireSameSource } from '../blocker-review/evidence.mjs';
import { overrideContract } from '../blocker-review/overrides.mjs';

const T = { main: 'main_units_tables', land: 'land_units_tables', weapon: 'missile_weapons_tables',
  projectile: 'projectiles_tables', attachment: 'land_units_to_battle_personalities_junctions_tables',
  junction: 'unit_missile_weapon_junctions_tables', modes: 'missile_weapons_to_projectiles_tables' };
const nonempty = value => value !== '' && value !== undefined && value !== null;
const ordered = rows => [...rows].sort((a, b) => a.id.localeCompare(b.id));
const sorted = values => [...values].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const conditionFields = [
  ['effect_bonus_value_missile_weapon_junctions_tables', 'missile_weapon_junction', T.junction],
  ['effect_bonus_value_missile_weapon_junctions_tables', 'effect', 'effects_tables'],
  ['character_skill_level_to_effects_junctions_tables', 'effect_key', 'effects_tables'],
  ['character_skill_level_to_effects_junctions_tables', 'character_skill_key', 'character_skills_tables'],
  ['character_skill_level_to_effects_junctions_tables', 'effect_scope', 'campaign_effect_scopes_tables'],
  ['effect_bundles_to_effects_junctions_tables', 'effect_key', 'effects_tables'],
  ['effect_bundles_to_effects_junctions_tables', 'effect_bundle_key', 'effect_bundles_tables'],
  ['effect_bundles_to_effects_junctions_tables', 'effect_scope', 'campaign_effect_scopes_tables'],
  ['technology_effects_junction_tables', 'effect', 'effects_tables'],
  ['technology_effects_junction_tables', 'technology', 'technologies_tables'],
  ['technology_effects_junction_tables', 'effect_scope', 'campaign_effect_scopes_tables'],
  ['building_effects_junction_tables', 'effect', 'effects_tables'],
  ['building_effects_junction_tables', 'building', 'building_levels_tables'],
  ['building_effects_junction_tables', 'effect_scope', 'campaign_effect_scopes_tables'],
  ['building_effects_junction_tables', 'context_requirement', 'building_effect_context_expressions_tables'],
  ['character_skill_nodes_tables', 'character_skill_key', 'character_skills_tables'],
  ['character_skill_node_set_items_tables', 'item', 'character_skill_nodes_tables'],
  ['character_skill_node_set_items_tables', 'set', 'character_skill_node_sets_tables'],
  ['character_skill_node_sets_tables', 'agent_subtype_key', 'agent_subtypes_tables'],
  ['ritual_payload_effect_bundles_tables', 'effect_bundle', 'effect_bundles_tables'],
  ['ritual_payload_effect_bundles_tables', 'payload', 'ritual_payloads_tables'],
  ...['completion_payload', 'start_payload', 'self_payload'].map(field => ['rituals_tables', field, 'ritual_payloads_tables']),
];
const conditionTables = new Set([...conditionFields.flatMap(([table, , target]) => [table, target]), 'frontend_faction_effect_junctions_tables']);

// Replays processed schema edges, never raw key matches. Each attachment/junction
// remains a distinct path even when the weapon/land/projectile keys are shared.
export function missileSourceContract(evidence, expected) {
  evidence = { ...evidence, rows: ordered(evidence.rows), relationships: sorted(evidence.relationships), issues: sorted(evidence.issues ?? []) };
  const issues = [...(evidence.issues ?? [])], paths = [];
  const rows = table => ordered(evidence.rows.filter(r => r.table === table));
  const mains = rows(T.main);
  if (!expected?.mainKey || mains.length !== 1 || rawFact(evidence, mains[0], 'unit')?.value !== expected.mainKey) throw new Error('Missile contract requires one exact source main key.');
  const main = mains[0];
  const links = (row, field, target) => {
    const fact = rawFact(evidence, row, field), found = connected(evidence, row, field, target);
    if (!fact || (nonempty(fact.value) && found.length !== 1)) issues.push({ rowId: row?.id, field, target, reason: 'Required named field/schema edge/unique target missing.' });
    return found;
  };
  const landLinks = links(main, 'land_unit', T.land), land = landLinks.length === 1 ? landLinks[0].row : null;
  if (!land || rawFact(evidence, land, 'key')?.value !== expected.landKey) throw new Error('Missile source land identity drift.');
  const prefix = [landLinks[0].edge];
  const facts = (row, fields) => Object.fromEntries(fields.map(field => [field, rawFact(evidence, row, field)]));
  const reverse = (table, field, target) => {
    // A completed filtered selection from an exposed pack table is required to
    // distinguish zero paths from an unavailable/unqueried relationship.
    if (!evidence.coverage?.some(c => c.tableFiles > 0 && c.query.table === table && c.query.where.some(w => w.field === field && (w.op === 'oneOf' ? w.value.includes(target.row.key ?? target.row.unit) : w.value === (target.row.key ?? target.row.unit))))) {
      issues.push({ table, field, reason: 'Reverse path scope not closed; absence is unknown.' });
    }
    return rows(table).filter(row => {
      const values = connected(evidence, row, field, target.table);
      if (row.row[field] === (target.row.key ?? target.row.unit) && !values.some(v => v.row.id === target.id)) issues.push({ rowId: row.id, field, reason: 'Selected reverse row has no verified owner edge.' });
      return values.some(v => v.row.id === target.id);
    });
  };
  const overrides = overrideContract(evidence);
  const add = (role, origin, edges, weaponLink, owner = {}, conditional = null) => {
    const weapon = weaponLink?.row;
    const projectilePaths = [];
    if (weapon) {
      for (const link of links(weapon, 'default_projectile', T.projectile)) projectilePaths.push({ kind: 'DEFAULT', key: rawFact(evidence, link.row, 'key')?.value, rowId: link.row.id, edges: [link.edge] });
      for (const mode of reverse(T.modes, 'missile_weapon', weapon)) {
        const membership = connected(evidence, mode, 'missile_weapon', T.weapon).find(x => x.row.id === weapon.id);
        for (const link of links(mode, 'projectile', T.projectile)) projectilePaths.push({ kind: 'ALTERNATE_DB_PATH', key: rawFact(evidence, link.row, 'key')?.value, rowId: link.row.id, junction: mode.id, raw: mode.row, edges: [membership.edge, link.edge] });
      }
      // A missile reference without a projectile is an incomplete DB chain.
      if (!projectilePaths.length) issues.push({ rowId: weapon.id, reason: 'No schema-connected projectile path.' });
      for (const projectile of projectilePaths) {
        const row = evidence.rows.find(r => r.id === projectile.rowId);
        links(row, 'explosion_type', 'projectiles_explosions_tables');
        links(row, 'projectile_penetration', 'projectile_penetration_junctions_tables');
      }
    }
    const allEdges = [...edges, ...(weaponLink ? [weaponLink.edge] : [])];
    const pathId = JSON.stringify([expected.mainKey, role, origin.id, allEdges.map(e => [e.from, e.field, e.to])]);
    paths.push({ pathId, role, sourceMainKey: expected.mainKey, sourceLandKey: expected.landKey,
      origin: { rowId: origin.id, table: origin.table, raw: origin.row }, owner,
      weaponKey: weapon ? rawFact(evidence, weapon, 'key')?.value ?? null : null,
      weaponRowId: weapon?.id ?? null, projectilePaths, edges: allEdges,
      rawWeaponFlags: weapon ? facts(weapon, ['precursor', 'use_secondary_ammo_pool', 'hide_secondary_range_ammo_statistics_ui']) : null,
      condition: conditional, activation: { placement: conditional?.enablingEffects.length ? 'CONDITIONAL' : role === 'LAND_PRIMARY' ? 'STATIC_PRIMARY' : role === 'MAIN_SPECIFIC_JUNCTION' ? 'RUNTIME_UNRESOLVED' : 'STATIC_COMPONENT',
        active: 'UNKNOWN', precedence: 'UNRESOLVED', combination: 'UNRESOLVED' },
      provenance: { kind: 'DIRECT', evidence: 'Processed schema relationships; role describes DB placement, never an active battle profile.' } });
  };
  const from = (role, origin, field, edges, owner, condition) => {
    const found = links(origin, field, T.weapon);
    if (nonempty(origin.row[field]) && !found.length) add(role, origin, edges, null, owner, condition);
    for (const link of found) add(role, origin, edges, link, owner, condition);
  };
  from('LAND_PRIMARY', land, 'primary_missile_weapon', prefix, { landRowId: land.id });
  for (const engine of links(land, 'engine', 'battlefield_engines_tables')) {
    const entity = links(engine.row, 'battle_entity', 'battle_entities_tables');
    from('ENGINE', engine.row, 'missile_weapon', [...prefix, engine.edge], { engineRowId: engine.row.id, entity: entity.map(e => ({ rowId: e.row.id, edge: e.edge })) });
  }
  for (const attachment of reverse(T.attachment, 'land_unit', land)) {
    const membership = connected(evidence, attachment, 'land_unit', T.land).find(x => x.row.id === land.id);
    for (const personality of links(attachment, 'battle_personality', 'battle_personalities_tables')) {
      const entity = links(personality.row, 'battle_entity', 'battle_entities_tables');
      for (const stats of links(personality.row, 'battle_entity_stats', 'battle_entity_stats_tables')) from('RIDER', stats.row, 'primary_missile_weapon', [...prefix, membership.edge, personality.edge, stats.edge],
        { attachmentRowId: attachment.id, personalityRowId: personality.row.id, statsRowId: stats.row.id, entity: entity.map(e => ({ rowId: e.row.id, edge: e.edge })),
          attachment: facts(attachment, ['attach', 'riders_attachment_point']), fireFlags: facts(personality.row, ['autonomous_rider_can_shoot_in_melee']) });
    }
  }
  for (const junction of reverse(T.junction, 'unit', main)) {
    const membership = connected(evidence, junction, 'unit', T.main).find(x => x.row.id === main.id);
    const condition = overrides.entries.find(e => e.junctionId?.source.rowId === junction.id) ?? null;
    const stats = links(junction, 'battle_entity_stats_override', 'battle_entity_stats_tables');
    const owner = { junctionRowId: junction.id, statsOverride: stats.map(s => ({ rowId: s.row.id, edge: s.edge })) };
    from('MAIN_SPECIFIC_JUNCTION', junction, 'missile_weapon', [membership.edge], owner, condition);
    for (const s of stats) from('JUNCTION_STATS_OVERRIDE', s.row, 'primary_missile_weapon', [membership.edge, s.edge], owner, condition);
  }
  for (const [table, field, target] of conditionFields) for (const row of rows(table)) links(row, field, target);
  for (const row of rows('frontend_faction_effect_junctions_tables')) {
    const refs = evidence.schemas.find(s => s.table === row.table && s.version === row.tableVersion)?.fields.filter(f => f.is_reference?.[0]?.replace(/_tables$/, '') === 'effects') ?? [];
    if (refs.length !== 1) issues.push({ rowId: row.id, reason: 'Frontend condition effect reference missing/ambiguous.' });
    else links(row, refs[0].name, 'effects_tables');
  }
  if (rows(T.junction).length) {
    for (const junction of rows(T.junction)) {
      // Uses id rather than key/unit: special explicit reverse coverage check.
      if (!evidence.coverage?.some(c => c.tableFiles > 0 && c.query.table === 'effect_bonus_value_missile_weapon_junctions_tables' && c.query.where.some(w => w.field === 'missile_weapon_junction' && w.value.includes(junction.row.id)))) issues.push({ rowId: junction.id, reason: 'Effect condition scope not closed.' });
    }
  }
  const ammo = facts(land, ['primary_ammo', 'secondary_ammo', 'infinite_secondary_ammo']);
  const ammoKnown = [ammo.primary_ammo, ammo.secondary_ammo].every(f => typeof f?.value === 'number' && Number.isFinite(f.value) && f.value >= 0);
  const orderedPaths = paths.sort((a, b) => a.pathId.localeCompare(b.pathId));
  const runtimeRequired = orderedPaths.length > 1 || orderedPaths.some(p => ['RIDER', 'MAIN_SPECIFIC_JUNCTION', 'JUNCTION_STATS_OVERRIDE'].includes(p.role) || p.projectilePaths.length > 1 || p.projectilePaths.some(x => x.kind !== 'DEFAULT'));
  const completeness = issues.length ? 'INCOMPLETE_DB_CHAIN' : !paths.length ? ammoKnown && ammo.primary_ammo.value === 0 && ammo.secondary_ammo.value === 0 ? 'NO_MISSILE_PATH' : 'UNKNOWN_APPLICABILITY'
    : runtimeRequired ? 'STRUCTURE_KNOWN_RUNTIME_UNRESOLVED' : 'COMPLETE_STATIC_SINGLE';
  return { format: 'warhammer-vault-missile-sources-v1', source: { mainKey: expected.mainKey, landKey: expected.landKey,
    mainFact: rawFact(evidence, main, 'unit'), landFact: rawFact(evidence, land, 'key'), mainToLand: landLinks[0].edge },
    provenance: evidence.provenance, sourceKind: evidence.sourceKind, paths: orderedPaths, ammo, issues,
    ammoSemantics: { displayConversion: 'UNRESOLVED', consumption: 'UNRESOLVED', poolSharing: 'UNRESOLVED', attachmentScaling: 'NOT_AUTHORIZED' },
    completeness, structure: issues.length ? 'INCOMPLETE' : 'COMPLETE_IN_BOUNDED_SCOPE',
    staticMultiplicity: paths.length === 0 ? 'NONE' : paths.length === 1 ? 'SINGLE' : 'MULTI',
    runtimeRequired: runtimeRequired || ['INCOMPLETE_DB_CHAIN', 'UNKNOWN_APPLICABILITY'].includes(completeness),
    presentation: { singleBlockSafe: completeness === 'COMPLETE_STATIC_SINGLE',
      reason: 'Only one complete static land/engine path with one projectile permits existing raw base-field mappings. Ammo/DPS gates still apply.' },
    policy: 'Path counts, attachment slots and ammo-pool flags are raw evidence. No ammo, volley, damage or entity arithmetic; no runtime precedence or representative weapon selection.',
    rawCounts: { weaponReferencePaths: paths.length, attachmentRows: rows(T.attachment).length,
      policy: 'Counts of DB references only, never displayed models/shots/ammo.' },
    conditionEvidence: { rowIds: evidence.rows.filter(r => conditionTables.has(r.table)).map(r => r.id).sort(),
      edges: evidence.relationships.filter(e => conditionTables.has(evidence.rows.find(r => r.id === e.from)?.table) || conditionTables.has(evidence.rows.find(r => r.id === e.to)?.table)),
      unavailableSources: evidence.steps?.filter(s => s.state === 'TABLE_UNAVAILABLE') ?? [],
      scope: 'Finite schema condition paths only; no script/session graph or active-profile inference.' } };
}

// Validate a sidecar against its evidence before using it as a normalization
// gate. Caller-supplied status/singleBlockSafe cannot bypass graph replay.
export function verifyMissileInspection(inspection, dump) {
  requireSameSource(inspection.evidence.provenance, dump.provenance);
  if (inspection.evidence.sourceKind !== dump.sourceKind) throw new Error('Missile evidence source kind drift.');
  const landKey = dump.rows.find(r => r.id === dump.rootRow)?.row.land_unit;
  const replay = missileSourceContract(inspection.evidence, { mainKey: dump.unit.caKey, landKey });
  if (JSON.stringify(replay) !== JSON.stringify(inspection.contract)) throw new Error('Missile contract differs from schema evidence replay.');
  for (const row of dump.rows.filter(r => [T.main, T.land, T.weapon, T.projectile].includes(r.table))) {
    const matches = inspection.evidence.rows.filter(r => r.table === row.table && JSON.stringify(r.key) === JSON.stringify(row.key));
    if (!matches.length && ![T.main, T.land].includes(row.table) && !replay.presentation.singleBlockSafe) continue;
    if (matches.length !== 1 || ['sourcePack', 'path', 'tableVersion'].some(key => matches[0][key] !== row[key]) || JSON.stringify(sorted(Object.entries(matches[0].row))) !== JSON.stringify(sorted(Object.entries(row.row)))) throw new Error('Missile evidence and trace raw row/pointer drift.');
  }
  return replay;
}

export function summarizeMissileSources(contracts) {
  const paths = contracts.flatMap(c => c.paths);
  return { unitsInspected: contracts.length, missilePaths: paths.length,
    roles: Object.fromEntries([...new Set(paths.map(p => p.role))].sort().map(role => [role, paths.filter(p => p.role === role).length])),
    distinctWeaponKeys: new Set(paths.map(p => p.weaponKey).filter(Boolean)).size,
    distinctProjectileKeys: new Set(paths.flatMap(p => p.projectilePaths.map(x => x.key)).filter(Boolean)).size,
    completeness: Object.fromEntries([...new Set(contracts.map(c => c.completeness))].sort().map(state => [state, contracts.filter(c => c.completeness === state).length])),
    staticSingle: contracts.filter(c => c.staticMultiplicity === 'SINGLE').length, staticMulti: contracts.filter(c => c.staticMultiplicity === 'MULTI').length,
    conditionalUnits: contracts.filter(c => c.paths.some(p => p.activation.placement === 'CONDITIONAL')).length,
    incompleteChains: contracts.filter(c => c.completeness === 'INCOMPLETE_DB_CHAIN').length,
    singleBlockBaseMappingSafe: contracts.filter(c => c.presentation.singleBlockSafe).length,
    completeSidecarUnrepresentable: contracts.filter(c => c.structure === 'COMPLETE_IN_BOUNDED_SCOPE' && c.paths.length && !c.presentation.singleBlockSafe).length,
    runtimeRequiredUnits: contracts.filter(c => c.runtimeRequired).length };
}
