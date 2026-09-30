import { EvidenceProbe, rawFact, connected, requireSameSource } from './evidence.mjs';

export async function inspectStructure(source, result) {
  requireSameSource(source.metadata, result.dump.provenance);
  const p = new EvidenceProbe(source, { maxRows: 250, maxQueries: 80 });
  await p.select('main_units_tables', 'unit', [result.dump.unit.caKey]);
  await p.forward('main_units_tables', 'land_unit', 'land_units_tables');
  for (const [field, target] of [['man_entity', 'battle_entities_tables'], ['mount', 'mounts_tables'], ['engine', 'battlefield_engines_tables'], ['articulated_record', 'land_unit_articulated_vehicles_tables']]) await p.forward('land_units_tables', field, target);
  await p.forward('mounts_tables', 'entity', 'battle_entities_tables');
  await p.forward('battlefield_engines_tables', 'battle_entity', 'battle_entities_tables');
  for (const field of ['articulated_entity', 'ammo_caisson_entity']) await p.forward('land_unit_articulated_vehicles_tables', field, 'battle_entities_tables');
  await p.reverse('land_units_to_battle_personalities_junctions_tables', 'land_unit', 'land_units_tables');
  await p.forward('land_units_to_battle_personalities_junctions_tables', 'battle_personality', 'battle_personalities_tables');
  await p.forward('battle_personalities_tables', 'battle_entity', 'battle_entities_tables');
  await p.forward('battle_personalities_tables', 'battle_entity_stats', 'battle_entity_stats_tables');
  for (const [table, field] of [['land_units_tables', 'primary_missile_weapon'], ['battlefield_engines_tables', 'missile_weapon'], ['battle_entity_stats_tables', 'primary_missile_weapon']]) await p.forward(table, field, 'missile_weapons_tables');
  await p.forward('missile_weapons_tables', 'default_projectile', 'projectiles_tables');
  await p.reverse('missile_weapons_to_projectiles_tables', 'missile_weapon', 'missile_weapons_tables');
  await p.forward('missile_weapons_to_projectiles_tables', 'projectile', 'projectiles_tables');
  for (const [field, target] of [['explosion_type', 'projectiles_explosions_tables'], ['projectile_penetration', 'projectile_penetration_junctions_tables']]) await p.forward('projectiles_tables', field, target);
  return { sample: result.sample, evidence: p.artifact(), entityContract: entityContract(p.artifact()), missileContract: missileContract(p.artifact()) };
}

export function entityContract(evidence) {
  const roots = evidence.rows.filter(r => r.table === 'main_units_tables');
  if (roots.length !== 1) throw new Error('Entity sidecar requires one root.');
  const root = roots[0], lands = connected(evidence, root, 'land_unit', 'land_units_tables');
  if (lands.length !== 1) throw new Error('Entity sidecar requires one schema-connected land row.');
  const land = lands[0].row, roles = [];
  function role(roleName, from, field, target, count, parentEdges = []) {
    const matches = connected(evidence, from, field, target);
    roles.push({ role: roleName, reference: rawFact(evidence, from, field), rawCount: count,
      cardinalityMeaning: 'UNRESOLVED: raw count is not a displayed total, multiplier or verified count of this role.',
      state: matches.length === 1 ? 'RESOLVED_REFERENCE' : matches.length ? 'AMBIGUOUS_REFERENCE' : from?.row[field] === '' ? 'EMPTY_REFERENCE' : 'MISSING_REFERENCE',
      targets: matches.map(x => ({ rowId: x.row.id, key: x.row.key, path: [...parentEdges, x.edge], properties: Object.fromEntries(['mass', 'size', 'hit_points', 'projectile_penetration_resistance'].map(f => [f, rawFact(evidence, x.row, f)])) })) });
    return matches;
  }
  role('man', land, 'man_entity', 'battle_entities_tables', rawFact(evidence, root, 'num_men'), [lands[0].edge]);
  for (const [field, table, entityField, count] of [['mount', 'mounts_tables', 'entity', 'num_mounts'], ['engine', 'battlefield_engines_tables', 'battle_entity', 'num_engines']]) {
    const links = connected(evidence, land, field, table);
    if (links.length === 1) role(field, links[0].row, entityField, 'battle_entities_tables', rawFact(evidence, land, count), [lands[0].edge, links[0].edge]);
    else roles.push({ role: field, reference: rawFact(evidence, land, field), rawCount: rawFact(evidence, land, count), state: land.row[field] === '' ? 'EMPTY_REFERENCE' : 'UNRESOLVED_REFERENCE', targets: [] });
  }
  const articulated = connected(evidence, land, 'articulated_record', 'land_unit_articulated_vehicles_tables');
  for (const link of articulated) for (const field of ['articulated_entity', 'ammo_caisson_entity']) role(field, link.row, field, 'battle_entities_tables', null, [lands[0].edge, link.edge]);
  const attachments = evidence.rows.filter(r => r.table === 'land_units_to_battle_personalities_junctions_tables' && connected(evidence, r, 'land_unit', 'land_units_tables').some(x => x.row.id === land.id));
  for (const attachment of attachments) {
    const personalities = connected(evidence, attachment, 'battle_personality', 'battle_personalities_tables');
    for (const personality of personalities) role(`attachment:${attachment.id}`, personality.row, 'battle_entity', 'battle_entities_tables', null, [connected(evidence, attachment, 'land_unit', 'land_units_tables')[0].edge, personality.edge]);
  }
  const composite = land.row.mount !== '' || land.row.engine !== '' || articulated.length > 0 || attachments.length > 0;
  return { format: 'warhammer-vault-entity-roles-v1', caKey: root.row.unit, roles,
    attachments: attachments.map(r => ({ rowId: r.id, raw: r.row })),
    displayPolicy: { count: 'OMIT', totalHealth: 'OMIT', mass: composite ? 'OMIT' : 'EXISTING_MAN_ONLY_POLICY', size: composite ? 'OMIT' : 'EXISTING_MAN_ONLY_POLICY' },
    policy: 'No aggregation or role deduplication by target row. Attachment records are DB slots, not live/displayed entity counts.',
    provenance: evidence.provenance };
}

export function missileContract(evidence) {
  const roots = evidence.rows.filter(r => r.table === 'main_units_tables');
  if (roots.length !== 1) throw new Error('Missile sidecar requires one root.');
  const lands = connected(evidence, roots[0], 'land_unit', 'land_units_tables');
  if (lands.length !== 1) throw new Error('Missile sidecar requires one schema-connected land row.');
  const weapons = evidence.rows.filter(r => r.table === 'missile_weapons_tables');
  const attachments = evidence.rows.filter(r => r.table === 'land_units_to_battle_personalities_junctions_tables');
  const paths = [];
  let unconnectedAttachments = false;
  for (const attachment of attachments) {
    const owner = connected(evidence, attachment, 'land_unit', 'land_units_tables').filter(x => x.row.id === lands[0].row.id);
    if (owner.length !== 1) { unconnectedAttachments = true; continue; }
    for (const p of connected(evidence, attachment, 'battle_personality', 'battle_personalities_tables')) for (const stats of connected(evidence, p.row, 'battle_entity_stats', 'battle_entity_stats_tables')) for (const weapon of connected(evidence, stats.row, 'primary_missile_weapon', 'missile_weapons_tables')) {
    const projectiles = connected(evidence, weapon.row, 'default_projectile', 'projectiles_tables');
    paths.push({ attachment: attachment.id, attach: rawFact(evidence, attachment, 'attach'), attachmentPoint: rawFact(evidence, attachment, 'riders_attachment_point'), personality: p.row.id, stats: stats.row.id,
      weaponKey: weapon.row.row.key, projectileKeys: projectiles.map(x => x.row.row.key), edges: [lands[0].edge, owner[0].edge, p.edge, stats.edge, weapon.edge, ...projectiles.map(x => x.edge)],
      useSecondaryAmmoPool: rawFact(evidence, weapon.row, 'use_secondary_ammo_pool'), hideSecondaryStatistics: rawFact(evidence, weapon.row, 'hide_secondary_range_ammo_statistics_ui'),
      canShootInMelee: rawFact(evidence, p.row, 'autonomous_rider_can_shoot_in_melee') });
  }
  }
  const missing = unconnectedAttachments || evidence.issues.length > 0 || paths.some(p => p.projectileKeys.length !== 1);
  return { status: missing ? 'INCOMPLETE_DB_CHAIN' : paths.length ? 'DB_CHAIN_FOUND_UNREPRESENTED' : 'NO_ADDITIONAL_RIDER_CHAIN_IN_SCOPE',
    weapons: weapons.map(r => ({ key: r.row.key, rowId: r.id, raw: r.row })), paths, unitMissileComplete: false,
    runtimeRequired: ['Displayed ammo versus shared/per-rider pool consumption', 'Simultaneous firing, firing arcs and live state', 'Live losses/scale/animations and derived display statistics'],
    policy: 'Multiple rider weapons remain separate raw paths. Do not choose one Unit.missile value, multiply shots by attachments or mark NOT_APPLICABLE.' };
}
