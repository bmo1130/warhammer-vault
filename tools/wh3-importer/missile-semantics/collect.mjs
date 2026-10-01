import { EvidenceProbe, requireSameSource } from '../blocker-review/evidence.mjs';
import { collectEffectConditions } from '../blocker-review/overrides.mjs';
import { missileSourceContract } from './contract.mjs';

// One exact main, finite schema paths, no reverse traversal to sibling mains.
export async function inspectMissileSources(source, dump) {
  requireSameSource(source.metadata, dump.provenance);
  const p = new EvidenceProbe(source, { maxRows: 400, maxQueries: 100 });
  const attempt = async (operation, table, field, target) => {
    try { await EvidenceProbe.prototype[operation].call(p, table, field, target); }
    catch (error) { p.issues.push({ table, field, reason: error.message }); }
  };
  // Continue independent branches after a broken edge, retaining the last
  // complete bounded graph. Failed queries never become proof of absence.
  p.forward = (table, field, target) => attempt('forward', table, field, target);
  p.reverse = (table, field, target) => attempt('reverse', table, field, target);
  await p.select('main_units_tables', 'unit', [dump.unit.caKey]);
  await p.forward('main_units_tables', 'land_unit', 'land_units_tables');
  await p.forward('land_units_tables', 'primary_missile_weapon', 'missile_weapons_tables');
  await p.forward('land_units_tables', 'engine', 'battlefield_engines_tables');
  await p.forward('battlefield_engines_tables', 'battle_entity', 'battle_entities_tables');
  await p.forward('battlefield_engines_tables', 'missile_weapon', 'missile_weapons_tables');
  await p.reverse('land_units_to_battle_personalities_junctions_tables', 'land_unit', 'land_units_tables');
  await p.forward('land_units_to_battle_personalities_junctions_tables', 'battle_personality', 'battle_personalities_tables');
  await p.forward('battle_personalities_tables', 'battle_entity', 'battle_entities_tables');
  await p.forward('battle_personalities_tables', 'battle_entity_stats', 'battle_entity_stats_tables');
  await p.forward('battle_entity_stats_tables', 'primary_missile_weapon', 'missile_weapons_tables');
  await p.reverse('unit_missile_weapon_junctions_tables', 'unit', 'main_units_tables');
  await p.forward('unit_missile_weapon_junctions_tables', 'missile_weapon', 'missile_weapons_tables');
  await p.forward('unit_missile_weapon_junctions_tables', 'battle_entity_stats_override', 'battle_entity_stats_tables');
  // An override stats row may itself own a weapon; do not ignore this edge.
  await p.forward('battle_entity_stats_tables', 'primary_missile_weapon', 'missile_weapons_tables');
  await p.forward('missile_weapons_tables', 'default_projectile', 'projectiles_tables');
  await p.reverse('missile_weapons_to_projectiles_tables', 'missile_weapon', 'missile_weapons_tables');
  await p.forward('missile_weapons_to_projectiles_tables', 'projectile', 'projectiles_tables');
  await p.forward('projectiles_tables', 'explosion_type', 'projectiles_explosions_tables');
  await p.forward('projectiles_tables', 'projectile_penetration', 'projectile_penetration_junctions_tables');
  if (p.rows('unit_missile_weapon_junctions_tables').length) {
    try { await collectEffectConditions(p, source); }
    catch (error) { p.issues.push({ reason: `Condition traversal: ${error.message}` }); }
  }
  const evidence = p.artifact();
  return { evidence, contract: missileSourceContract(evidence, { mainKey: dump.unit.caKey,
    landKey: dump.rows.find(r => r.id === dump.rootRow)?.row.land_unit }) };
}
