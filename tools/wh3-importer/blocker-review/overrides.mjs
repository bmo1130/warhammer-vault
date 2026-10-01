import { EvidenceProbe, connected, rawFact, requireSameSource } from './evidence.mjs';

export async function inspectOverrides(source, result) {
  requireSameSource(source.metadata, result.dump.provenance);
  const p = new EvidenceProbe(source, { maxRows: 250, maxQueries: 80 });
  await p.select('main_units_tables', 'unit', [result.dump.unit.caKey]);
  await p.forward('main_units_tables', 'land_unit', 'land_units_tables');
  await p.forward('land_units_tables', 'primary_missile_weapon', 'missile_weapons_tables');
  await p.reverse('unit_missile_weapon_junctions_tables', 'unit', 'main_units_tables');
  await p.forward('unit_missile_weapon_junctions_tables', 'missile_weapon', 'missile_weapons_tables');
  await p.forward('unit_missile_weapon_junctions_tables', 'battle_entity_stats_override', 'battle_entity_stats_tables');
  await p.forward('missile_weapons_tables', 'default_projectile', 'projectiles_tables');
  await p.reverse('missile_weapons_to_projectiles_tables', 'missile_weapon', 'missile_weapons_tables');
  await p.forward('missile_weapons_to_projectiles_tables', 'projectile', 'projectiles_tables');
  await p.forward('projectiles_tables', 'explosion_type', 'projectiles_explosions_tables');
  await collectEffectConditions(p, source);
  const evidence = p.artifact();
  return { sample: result.sample, evidence, contract: overrideContract(evidence) };
}

// Shared finite condition traversal. Existence of these edges is not activation.
export async function collectEffectConditions(p, source) {
  await p.reverse('effect_bonus_value_missile_weapon_junctions_tables', 'missile_weapon_junction', 'unit_missile_weapon_junctions_tables');
  await p.forward('effect_bonus_value_missile_weapon_junctions_tables', 'effect', 'effects_tables');
  for (const [table, field] of [
    ['character_skill_level_to_effects_junctions_tables', 'effect_key'],
    ['effect_bundles_to_effects_junctions_tables', 'effect_key'],
    ['technology_effects_junction_tables', 'effect'],
    ['building_effects_junction_tables', 'effect'],
  ]) await p.reverse(table, field, 'effects_tables');
  const frontend = await source.reader.tables('frontend_faction_effect_junctions_tables');
  if (frontend.length) {
    const effectField = frontend[0].fields.find(f => f.is_reference?.[0]?.replace(/_tables$/, '') === 'effects');
    if (!effectField) throw new Error('Frontend effect reference changed; review schema before following.');
    await p.reverse('frontend_faction_effect_junctions_tables', effectField.name, 'effects_tables');
  } else p.steps.push({ table: 'frontend_faction_effect_junctions_tables', state: 'TABLE_UNAVAILABLE', reason: 'No pack table exposed; frontend sources not established.' });
  await p.forward('character_skill_level_to_effects_junctions_tables', 'character_skill_key', 'character_skills_tables');
  await p.forward('character_skill_level_to_effects_junctions_tables', 'effect_scope', 'campaign_effect_scopes_tables');
  await p.reverse('character_skill_nodes_tables', 'character_skill_key', 'character_skills_tables');
  await p.reverse('character_skill_node_set_items_tables', 'item', 'character_skill_nodes_tables');
  await p.forward('character_skill_node_set_items_tables', 'set', 'character_skill_node_sets_tables');
  await p.forward('character_skill_node_sets_tables', 'agent_subtype_key', 'agent_subtypes_tables');
  await p.forward('effect_bundles_to_effects_junctions_tables', 'effect_bundle_key', 'effect_bundles_tables');
  await p.forward('effect_bundles_to_effects_junctions_tables', 'effect_scope', 'campaign_effect_scopes_tables');
  await p.forward('technology_effects_junction_tables', 'technology', 'technologies_tables');
  await p.forward('technology_effects_junction_tables', 'effect_scope', 'campaign_effect_scopes_tables');
  await p.forward('building_effects_junction_tables', 'building', 'building_levels_tables');
  await p.forward('building_effects_junction_tables', 'effect_scope', 'campaign_effect_scopes_tables');
  await p.forward('building_effects_junction_tables', 'context_requirement', 'building_effect_context_expressions_tables');
  await p.reverse('ritual_payload_effect_bundles_tables', 'effect_bundle', 'effect_bundles_tables');
  await p.forward('ritual_payload_effect_bundles_tables', 'payload', 'ritual_payloads_tables');
  for (const field of ['completion_payload', 'start_payload', 'self_payload']) await p.reverse('rituals_tables', field, 'ritual_payloads_tables');
}

export function overrideContract(evidence) {
  const conditionEffects = condition => {
    const fields = evidence.schemas.find(s => s.table === condition.table && s.version === condition.tableVersion)?.fields.filter(f => f.is_reference?.[0]?.replace(/_tables$/, '') === 'effects') ?? [];
    return fields.length === 1 ? connected(evidence, condition, fields[0].name, 'effects_tables') : [];
  };
  const overrides = evidence.rows.filter(r => r.table === 'unit_missile_weapon_junctions_tables');
  const entries = overrides.map(row => ({
    junctionId: rawFact(evidence, row, 'id'), weapon: connected(evidence, row, 'missile_weapon', 'missile_weapons_tables').map(x => ({ key: x.row.row.key, rowId: x.row.id, edge: x.edge })),
    entityStatsOverride: rawFact(evidence, row, 'battle_entity_stats_override'),
    enablingEffects: evidence.rows.filter(r => r.table === 'effect_bonus_value_missile_weapon_junctions_tables' && connected(evidence, r, 'missile_weapon_junction', 'unit_missile_weapon_junctions_tables').some(x => x.row.id === row.id)).map(r => ({ rowId: r.id, raw: r.row,
      conditions: evidence.rows.filter(condition => ['character_skill_level_to_effects_junctions_tables', 'effect_bundles_to_effects_junctions_tables', 'technology_effects_junction_tables', 'building_effects_junction_tables', 'frontend_faction_effect_junctions_tables'].includes(condition.table) && conditionEffects(condition).some(x => connected(evidence, r, 'effect', 'effects_tables').some(y => y.row.id === x.row.id))).map(condition => ({ rowId: condition.id, table: condition.table, raw: condition.row })) })),
    active: 'UNKNOWN', precedence: 'UNRESOLVED',
  }));
  return { format: 'warhammer-vault-missile-overrides-v1', entries, unitMissileComplete: false,
    policy: 'Effect/skill/bundle links describe DB conditions, not active runtime state. Preserve every branch. Never apply effect values, choose an override, merge profiles or infer precedence from key/order/priority.',
    runtimeRequired: ['Skill enabled vs disabled under the linked character/army scope', 'Ritual bundle active vs absent', 'Both effects active: which projectile wins, or whether behavior combines'] };
}
