import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
const research = 'wh_dlc07_tech_brt_economy_industry_tournaments';
const main = 'wh_main_brt_cav_grail_knights';
const scope = 'faction_to_force_own_unseen';
const rules = [
  ['wh2_main_effect_force_stat_melee_attack_brt_knights', 'melee_attack_mod', 'melee.meleeAttack', 'Melee attack: %+n for Knights units'],
  ['wh2_main_effect_force_stat_melee_defence_brt_knights', 'melee_defence_mod', 'defense.meleeDefense', 'Melee defence: %+n for Knight units'],
];

// Explicit review of ONE source snapshot and ONE calculator target. This is
// not a resolver for campaign scope, all knight units or arbitrary CA bonuses.
export function reviewResearch(sourceBytes, admission) {
  assert.equal(hash(sourceBytes), admission.sourceSha256, 'Source drift: re-review required');
  const source = JSON.parse(sourceBytes);
  assert.equal(source.format, 'wh3-reviewed-research-source-v1');
  assert.equal(source.originalExtraction.sha256, admission.originalExtractionSha256);
  assert.equal(admission.researchKey, research);
  assert.equal(admission.mainKey, main); assert.equal(admission.landKey, main);
  assert.equal(admission.unitId, `ca_unit_${main}`);
  assert.equal(admission.snapshotId, 'c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5');
  assert.equal(source.provenance.gameVersion, '9.0.2.0');
  assert.equal(source.provenance.schemaSha256, '5d628a0167b34a096752c5c21acd16493834a987c80dc9f02364617f796ba2a4');
  const packs = source.provenance.packs;
  assert.equal(packs.length, 2);
  assert.equal(packs.find(p => p.file_name === 'db.pack')?.sha256, 'd0fafac984b3985ec47cec0ea957591424f1077e52ef61941dbf2dc46e6cf723');
  assert.equal(packs.find(p => p.file_name === 'local_en.pack')?.sha256, 'f979527a5aaecf293a4e66afc25ed6c760e4107ef4920b73bd56e10e2652fd6a');
  const ids = new Set();
  for (const r of source.rows) {
    assert(!ids.has(r.id), 'Duplicate row'); ids.add(r.id);
    assert.equal(r.id, `${r.table}:${hash(JSON.stringify([r.sourcePack, r.path, r.key, r.row])).slice(0, 20)}`, 'Row identity drift');
    assert(packs.some(p => p.file_name === r.sourcePack), 'Unknown pack');
  }
  const rows = (table, field, value) => source.rows.filter(r => r.table === table && r.row[field] === value);
  const one = (table, field, value) => { const matches = rows(table, field, value); assert.equal(matches.length, 1, `Non-exact ${table}.${field}=${value}`); return matches[0]; };
  const definition = r => { const matches = source.schemas.filter(s => s.table === r.table && s.version === r.tableVersion); assert.equal(matches.length, 1); return matches[0]; };
  const join = (from, field, to, targetField) => {
    assert.deepEqual(definition(from).fields.find(f => f.name === field)?.is_reference, [to.table.replace(/_tables$/, ''), targetField], `Schema join drift: ${field}`);
    assert.equal(from.row[field], to.row[targetField]);
    assert(source.relationships.some(j => j.from === from.id && j.field === field && j.to === to.id && j.targetField === targetField && j.value === from.row[field]), 'Missing source relationship');
    return { from: from.id, field, to: to.id, targetField };
  };
  const loc = (r, field, expected) => {
    assert(definition(r).localisedFields.includes(field));
    const l = one('Loc', 'key', `${r.table.replace(/_tables$/, '')}_${field}_${Object.values(r.key)[0]}`);
    assert.equal(l.row.text, expected, 'Localisation/operation drift');
    assert.equal(l.sourcePack, 'local_en.pack');
    assert(source.relationships.some(j => j.from === r.id && j.to === l.id && j.field === field), 'Missing localisation relationship');
    return l;
  };
  const tech = one('technologies_tables', 'key', research);
  assert.equal(tech.row.is_hidden, false);
  const name = loc(tech, 'onscreen_name', 'Regular Tournaments');
  const node = one('technology_nodes_tables', 'technology_key', research);
  const nodeSet = one('technology_node_sets_tables', 'key', 'brt_mil');
  const culture = one('cultures_tables', 'key', 'wh_main_brt_bretonnia');
  assert.equal(node.row.campaign_key, ''); assert.equal(node.row.faction_key, '');
  assert.equal(nodeSet.row.campaign_key, ''); assert.equal(nodeSet.row.faction_key, ''); assert.equal(nodeSet.row.subculture, '');
  const availability = [join(node, 'technology_key', tech, 'key'), join(node, 'technology_node_set', nodeSet, 'key'), join(nodeSet, 'culture', culture, 'key')];
  const scopeRow = one('campaign_effect_scopes_tables', 'key', scope);
  assert.deepEqual(scopeRow.row, { key: scope, location: 'factionwide', ownership: 'yours', source: 'faction', target: 'force', territory: 'any' });
  const unitSet = one('unit_sets_tables', 'key', 'brt_knights');
  assert.equal(unitSet.row.use_unit_exp_level_range, false);
  assert.equal(unitSet.row.special_category, '');
  const unit = one('main_units_tables', 'unit', main);
  const land = one('land_units_tables', 'key', main);
  const members = rows('unit_set_to_unit_junctions_tables', 'unit_set', 'brt_knights');
  const membership = members.filter(r => r.row.unit_record === main);
  assert.equal(membership.length, 1);
  assert.equal(membership[0].row.exclude, false);
  for (const selector of ['unit_caste', 'unit_category', 'unit_class']) assert.equal(membership[0].row[selector], '');
  const applicability = [join(membership[0], 'unit_set', unitSet, 'key'), join(membership[0], 'unit_record', unit, 'unit'), join(unit, 'land_unit', land, 'key')];
  assert.equal(land.row.melee_attack, 38); assert.equal(land.row.melee_defence, 34);
  const junctions = rows('technology_effects_junction_tables', 'technology', research);
  assert.equal(junctions.length, 2, 'Competing/unsupported technology effect');
  const coverage = (table, field, value, count) => assert(source.coverage.some(c => c.query.table === table && c.query.where.length === 1 && c.query.where[0].field === field && c.query.where[0].op === 'eq' && c.query.where[0].value === value && c.matchedRows === count), 'Incomplete bounded coverage');
  coverage('technology_effects_junction_tables', 'technology', research, 2);
  coverage('unit_set_to_unit_junctions_tables', 'unit_set', 'brt_knights', members.length);
  // The percent sign in %+n is a substitution token; CA's percentage
  // description retains an additional trailing literal %. No generic parser.
  const percentContrast = one('Loc', 'key', 'effects_description_wh2_main_effect_force_stat_charge_bonus_pct_brt_knights');
  assert.equal(percentContrast.row.text, 'Charge bonus: %+n% for Knight units');
  const effects = rules.map(([key, bonus, stat, description]) => {
    const junction = one('technology_effects_junction_tables', 'effect', key);
    assert.equal(junction.row.technology, research); assert.equal(junction.row.value, 5);
    const effect = one('effects_tables', 'effect', key);
    assert.equal(effect.row.category, 'battle'); assert.equal(effect.row.is_positive_value_good, true);
    const target = one('effect_bonus_value_ids_unit_sets_tables', 'effect', key);
    assert.equal(target.row.bonus_value_id, bonus);
    assert.equal(target.row.unit_set, 'brt_knights');
    const text = loc(effect, 'description', description);
    return { effectKey: key, bonusValueId: bonus, rawValue: junction.row.value, scope,
      operationBasis: { kind: 'EXACT_CA_LOCALISATION_FLAT_STAT', rowId: text.id, description, percentageContrastRowId: percentContrast.id },
      chain: [join(junction, 'technology', tech, 'key'), join(junction, 'effect', effect, 'effect'), join(junction, 'effect_scope', scopeRow, 'key'), join(target, 'effect', effect, 'effect'), join(target, 'unit_set', unitSet, 'key')],
      modifier: { id: `ca-research:${research}:${key}`, sourceType: 'research', sourceId: research, targetType: 'unit', targetId: admission.unitId, stat, operation: 'add', value: 5, scope: 'faction', gameVersion: '9.0.2.0', source: `CA_RESEARCH · ${key}`, tags: [] },
    };
  });
  const review = { format: 'wh3-reviewed-research-v1', status: 'VERIFIED', sourceKind: 'CA_RESEARCH', researchKey: research, name: name.row.text, localisationRowId: name.id,
    sourceSha256: admission.sourceSha256, originalExtractionSha256: admission.originalExtractionSha256, snapshotId: admission.snapshotId,
    provenance: source.provenance, availability, scope: scopeRow.row, applicability, unitId: admission.unitId, mainKey: main, landKey: main, effects,
    limitations: ['Only this exact Grail Knights calculator target is projected; not all members of the CA unit set.', 'Selection declares completed research for the owning Bretonnian faction; no campaign save/ownership resolver.', 'Bonus ID engine enumeration is not available as a decoded DB table. ADD is reviewed from exact CA stat descriptions, not an invented unit_stat_modifiers join.', 'Internal stacking uses the existing calculator contract; no claim about all in-game effect combinations.'] };
  const projection = { sourceKind: review.sourceKind, researchKey: research, name: review.name, unitId: review.unitId, mainKey: main, landKey: main,
    sourceSha256: review.sourceSha256, reviewSha256: hash(JSON.stringify(review)), snapshotId: review.snapshotId, gameVersion: '9.0.2.0',
    scope: review.scope, modifiers: effects.map(e => e.modifier) };
  return { review, projection };
}
