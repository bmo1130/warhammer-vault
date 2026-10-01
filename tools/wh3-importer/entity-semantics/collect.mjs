import { EvidenceProbe, requireSameSource } from '../blocker-review/evidence.mjs';
import { entityStructureContract } from './contract.mjs';

// Explicit bounded component traversal. No weapon traversal, sibling main
// discovery, count arithmetic, or battle/session execution.
export async function inspectEntityStructure(source, dump) {
  requireSameSource(source.metadata, dump.provenance);
  const p = new EvidenceProbe(source, { maxRows: 400, maxQueries: 60 });
  const attempt = async (operation, ...args) => {
    try { await EvidenceProbe.prototype[operation].call(p, ...args); }
    catch (error) { p.issues.push({ table: args[0], field: args[1], reason: error.message }); }
  };
  p.forward = (...args) => attempt('forward', ...args);
  p.reverse = (...args) => attempt('reverse', ...args);
  await p.select('main_units_tables', 'unit', [dump.unit.caKey]);
  await p.forward('main_units_tables', 'land_unit', 'land_units_tables');
  for (const [field, target] of [['man_entity', 'battle_entities_tables'], ['mount', 'mounts_tables'],
    ['engine', 'battlefield_engines_tables'], ['articulated_record', 'land_unit_articulated_vehicles_tables']]) await p.forward('land_units_tables', field, target);
  await p.forward('mounts_tables', 'entity', 'battle_entities_tables');
  await p.forward('battlefield_engines_tables', 'battle_entity', 'battle_entities_tables');
  for (const field of ['articulated_entity', 'ammo_caisson_entity']) await p.forward('land_unit_articulated_vehicles_tables', field, 'battle_entities_tables');
  await p.reverse('land_units_to_battle_personalities_junctions_tables', 'land_unit', 'land_units_tables');
  await p.forward('land_units_to_battle_personalities_junctions_tables', 'battle_personality', 'battle_personalities_tables');
  await p.forward('battle_personalities_tables', 'battle_entity', 'battle_entities_tables');
  await p.forward('battle_personalities_tables', 'battle_entity_stats', 'battle_entity_stats_tables');
  await p.forward('battle_entities_tables', 'locomotion_constants', 'battle_entity_locomotion_constants_tables');
  // These rows own weapon-only stats in the reviewed schema, not physical
  // entities. Preserve their exact-main scope without inventing an entity owner.
  await p.reverse('unit_missile_weapon_junctions_tables', 'unit', 'main_units_tables');
  await p.forward('unit_missile_weapon_junctions_tables', 'battle_entity_stats_override', 'battle_entity_stats_tables');
  const evidence = p.artifact();
  return { evidence, contract: entityStructureContract(evidence, { mainKey: dump.unit.caKey,
    landKey: dump.rows.find(r => r.id === dump.rootRow)?.row.land_unit }) };
}

// Independent global evidence, not an edge from a particular source/count.
// Even complete rows do not authorize any scaling formula.
export async function inspectUnitSizeEvidence(source) {
  const p = new EvidenceProbe(source, { maxRows: 400, maxQueries: 20 });
  const tables = await source.reader.tables('unit_sizes_tables');
  const values = tables.flatMap(t => t.rows.map(r => r.size));
  await p.select('unit_sizes_tables', 'size', values);
  await p.reverse('unit_stat_to_size_scaling_values_tables', 'size', 'unit_sizes_tables');
  await p.forward('unit_stat_to_size_scaling_values_tables', 'stat', 'modifiable_unit_stats_tables');
  return { status: 'UNRESOLVED', evidence: p.artifact(), applicationToSourceCounts: 'UNRESOLVED',
    reason: 'Global size/stat scalar rows do not prove base-count setting, component allocation, card count or runtime application. No scalar applied.' };
}
