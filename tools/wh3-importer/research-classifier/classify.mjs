import { createHash } from 'node:crypto';
import { isDeepStrictEqual as equal } from 'node:util';
import { digest, snapshotIdentity } from '../runtime-evidence/contract.mjs';
import { pins, technologyKeys, ownForceScope, operations, effectMappings, rejectedEffects,
  membershipFields, selectorFields, baseRuleIds } from './policy.mjs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const states = ['DIRECT_CANDIDATE', 'REVIEW_REQUIRED', 'UNSUPPORTED', 'NON_UNIT_STAT'];
const sorted = values => [...values].sort();
const gate = (condition, reason) => { if (!condition) throw Object.assign(new Error(reason), { reason }); };
const counts = values => Object.fromEntries(sorted(new Set(values)).map(v => [v, values.filter(x => x === v).length]));
const breakdown = effects => Object.fromEntries(states.map(s => [s, effects.filter(e => e.status === s).length]));

// These pure graph helpers do not confer source trust or return an admission.
// The report entry point below alone verifies the committed byte envelope.
function graph(source) {
  const rows = (table, field, value) => source.rows.filter(r => r.table === table && r.row[field] === value);
  const one = (table, field, value) => {
    const found = rows(table, field, value); gate(found.length === 1, 'IDENTITY_NOT_EXACT'); return found[0];
  };
  const schema = row => {
    const found = source.schemas.filter(s => s.table === row.table && s.version === row.tableVersion);
    gate(found.length === 1, 'SCHEMA_REFERENCE_MISSING'); return found[0];
  };
  const relation = (a, field, b, targetField, value = a.row[field]) => {
    gate(source.relationships.some(r => r.from === a.id && r.field === field && r.to === b.id &&
      r.targetField === targetField && r.value === value), 'SOURCE_RELATIONSHIP_MISSING');
    return { from: a.id, field, to: b.id, targetField, value };
  };
  const join = (a, field, b, targetField) => {
    gate(equal(schema(a).fields.find(f => f.name === field)?.is_reference,
      [b.table.replace(/_tables$/, ''), targetField]), 'SCHEMA_REFERENCE_CORRUPT');
    gate(a.row[field] === b.row[targetField], 'IDENTITY_JOIN_MISMATCH');
    return relation(a, field, b, targetField);
  };
  const loc = (row, field) => {
    gate(schema(row).localisedFields.includes(field), 'LOCALISATION_SCHEMA_MISSING');
    const key = `${row.table.replace(/_tables$/, '')}_${field}_${Object.values(row.key)[0]}`;
    const l = one('Loc', 'key', key);
    gate(l.path === (row.table === 'technologies_tables' ? 'text/db/technologies__.loc' : 'text/db/effects__.loc'), 'LOCALISATION_SOURCE_MISMATCH');
    relation(row, field, l, 'key', key); return l;
  };
  const covered = (table, field, value, length) => gate(source.coverage.some(c => c.query.table === table &&
    c.query.where.length === 1 && equal(c.query.where[0], { field, op: 'eq', value }) &&
    c.matchedRows === length && c.tableFiles > 0), 'TARGET_COVERAGE_INCOMPLETE');
  return { rows, one, join, loc, covered };
}

export function mapVerifiedEffect(effectKey, description, rawValue, scope, links) {
  gate(equal(scope, ownForceScope), 'SCOPE_NOT_VERIFIED_OWN_FORCE');
  const rule = effectMappings[effectKey]; gate(rule, 'EFFECT_MAPPING_UNVERIFIED');
  gate(description === rule.description, 'LOCALISATION_MAPPING_MISMATCH');
  gate(typeof rawValue === 'number' && Number.isFinite(rawValue), 'RAW_VALUE_NOT_FINITE');
  const expected = rule.mappings.flatMap(m => rule.sets.map(set => `${m.bonus}:${set}`)).sort();
  gate(links.every(l => l.table === 'effect_bonus_value_ids_unit_sets_tables' && l.row.effect === effectKey), 'TARGET_RELATION_NOT_APPROVED');
  gate(equal(links.map(l => `${l.row.bonus_value_id}:${l.row.unit_set}`).sort(), expected), 'TARGET_SET_OR_BONUS_MISMATCH');
  for (const m of rule.mappings) {
    gate(operations[m.stat] === m.operation && ['add', 'multiply'].includes(m.operation), 'UNKNOWN_OPERATION');
    gate(description.includes(m.operation === 'multiply' ? '%+n%' : '%+n') &&
      (m.operation !== 'add' || !description.includes('%+n%')), 'VALUE_UNIT_UNVERIFIED');
  }
  return rule.mappings.map(m => ({ ...m, value: rawValue })); // Includes 0; no scaling/rounding.
}

export function resolveExplicitTargets(source, units, links) {
  const g = graph(source), hits = [], omitted = [];
  for (const link of links) {
    const set = g.one('unit_sets_tables', 'key', link.row.unit_set);
    g.join(link, 'unit_set', set, 'key');
    gate(set.row.use_unit_exp_level_range === false && set.row.min_unit_exp_level_inclusive === -1 &&
      set.row.max_unit_exp_level_inclusive === -1 && set.row.special_category === '', 'SET_COMPOSITION_UNRESOLVED');
    const members = g.rows('unit_set_to_unit_junctions_tables', 'unit_set', set.row.key);
    g.covered('unit_set_to_unit_junctions_tables', 'unit_set', set.row.key, members.length);
    const byMain = new Map();
    for (const member of members) {
      gate(equal(sorted(Object.keys(member.row)), sorted(membershipFields)), 'UNKNOWN_MEMBERSHIP_SELECTOR');
      gate(selectorFields.every(f => member.row[f] === '') && member.row.unit_record, 'SELECTOR_UNSUPPORTED');
      gate(typeof member.row.exclude === 'boolean', 'INCLUDE_STATE_UNKNOWN');
      g.join(member, 'unit_set', set, 'key');
      const previous = byMain.get(member.row.unit_record);
      gate(!previous || equal(previous.row, member.row), 'TARGET_MEMBERSHIP_CONFLICT');
      // Identical rows collapse deterministically; preserve all source references.
      if (!previous) byMain.set(member.row.unit_record, { ...member, rowIds: [member.id] });
      else previous.rowIds = sorted(new Set([...previous.rowIds, member.id]));
    }
    for (const member of byMain.values()) hits.push({ link, set, member });
  }
  const targets = [];
  for (const mainKey of sorted(new Set(hits.map(h => h.member.row.unit_record)))) {
    const group = hits.filter(h => h.member.row.unit_record === mainKey);
    const registry = units.filter(u => u.id === `ca_unit_${mainKey}` && u.gameVersion !== 'sample');
    const reasons = [];
    if (group.some(h => h.member.row.exclude)) reasons.push('TARGET_EXCLUDED_OR_CONFLICTING');
    if (new Set(group.map(h => h.set.row.key)).size !== 1) reasons.push('TARGET_MEMBERSHIP_AMBIGUOUS');
    if (!registry.length) reasons.push('TARGET_NOT_IN_PRODUCTION');
    if (reasons.length) {
      // No source proof for non-catalog chains is invented. Keep their rejection.
      if (registry.length) gate(false, reasons[0]);
      omitted.push({ mainKey, reasonIds: reasons, membershipRowIds: sorted(group.flatMap(h => h.member.rowIds)) }); continue;
    }
    gate(registry.length === 1 && registry[0].gameVersion === pins.gameVersion, 'PRODUCTION_IDENTITY_MISMATCH');
    const main = g.one('main_units_tables', 'unit', mainKey);
    const land = g.one('land_units_tables', 'key', main.row.land_unit);
    const identity = g.join(main, 'land_unit', land, 'key');
    const { link, set, member } = group[0];
    const chains = [g.join(member, 'unit_record', main, 'unit'), g.join(member, 'unit_set', set, 'key'),
      g.join(link, 'unit_set', set, 'key'), identity];
    targets.push({ unitId: registry[0].id, mainKey, landKey: land.row.key, unitSet: set.row.key,
      membershipRowIds: member.rowIds, targetRowId: link.id, mainRowId: main.id, landRowId: land.id,
      relationshipRefs: chains.map(c => [c.from, c.field, c.to]) });
  }
  return { targets, omitted };
}

export function buildResearchCandidate(technology, junction, mapping, target, evidence) {
  gate(typeof mapping.value === 'number' && Number.isFinite(mapping.value), 'RAW_VALUE_NOT_FINITE');
  gate(operations[mapping.stat] === mapping.operation, 'UNKNOWN_OPERATION');
  gate(mapping.value === junction.row.value, 'RAW_VALUE_TRANSFORMATION_NOT_APPROVED');
  gate(effectMappings[junction.row.effect]?.mappings.some(m => m.bonus === mapping.bonus &&
    m.stat === mapping.stat && m.operation === mapping.operation && m.ruleId === mapping.ruleId), 'EFFECT_MAPPING_UNVERIFIED');
  gate(evidence?.effectDefinitionRowId && evidence.effectLocalisationRowId && evidence.scopeRowId &&
    evidence.effectTraceSourceRowId === junction.id && target.membershipRowIds?.length &&
    target.relationshipRefs?.length && target.mainRowId && target.landRowId,
    'CANDIDATE_PROVENANCE_MISSING');
  return { technologyKey: technology.key, technologyName: technology.name,
    technologyLocalisationRowId: technology.localisationRowId, effectKey: junction.row.effect,
    effectRowId: junction.id, rawValue: junction.row.value, scope: junction.row.effect_scope,
    unitId: target.unitId, mainKey: target.mainKey, landKey: target.landKey, unitSet: target.unitSet,
    membershipRowIds: target.membershipRowIds, targetRowId: target.targetRowId,
    mainRowId: target.mainRowId, landRowId: target.landRowId, relationshipRefs: target.relationshipRefs,
    stat: mapping.stat, operation: mapping.operation, value: mapping.value,
    provenance: { sourceKind: 'CA_RESEARCH_CANDIDATE', sourceRef: 'source', evidence },
    ruleIds: [...baseRuleIds, mapping.ruleId] };
}

function classifyResearchEffect(source, units, technology, junction) {
  const g = graph(source), key = junction.row.effect;
  const result = { effectKey: key, sourceRowId: junction.id, rawValue: junction.row.value,
    scope: junction.row.effect_scope, status: 'REVIEW_REQUIRED', reasonIds: [], candidates: [], omittedTargets: [] };
  try {
    gate(typeof junction.row.value === 'number' && Number.isFinite(junction.row.value), 'RAW_VALUE_NOT_FINITE');
    const tech = g.one('technologies_tables', 'key', technology.key);
    const effect = g.one('effects_tables', 'effect', key), description = g.loc(effect, 'description');
    const scope = g.one('campaign_effect_scopes_tables', 'key', junction.row.effect_scope);
    result.description = description.row.text;
    result.evidence = [g.join(junction, 'technology', tech, 'key'), g.join(junction, 'effect', effect, 'effect'),
      g.join(junction, 'effect_scope', scope, 'key')];
    result.localisationRowId = description.id;
    const links = source.rows.filter(r => ['effect_bonus_value_ids_unit_sets_tables', 'effect_bonus_value_basic_junction_tables']
      .includes(r.table) && r.row.effect === key);
    result.targetRowIds = sorted(links.map(l => l.id));
    for (const link of links) result.evidence.push(g.join(link, 'effect', effect, 'effect'));
    const rejected = rejectedEffects[key];
    if (rejected) { [result.status, ...result.reasonIds] = rejected; return result; }
    const mappings = mapVerifiedEffect(key, description.row.text, junction.row.value, scope.row, links);
    for (const m of mappings) {
      const resolved = resolveExplicitTargets(source, units, links.filter(l => l.row.bonus_value_id === m.bonus));
      result.omittedTargets.push(...resolved.omitted.map(t => ({ ...t, bonus: m.bonus })));
      for (const t of resolved.targets) result.candidates.push(buildResearchCandidate(technology, junction, m, t,
        { effectDefinitionRowId: effect.id, effectLocalisationRowId: description.id, scopeRowId: scope.id,
          bonus: m.bonus, effectTraceSourceRowId: junction.id }));
    }
    gate(result.candidates.length > 0, 'NO_EXACT_PRODUCTION_TARGET');
    result.status = 'DIRECT_CANDIDATE';
  } catch (error) {
    if (!error.reason) throw error;
    result.candidates = []; result.reasonIds = [error.reason];
  }
  return result;
}

// No human review/admission file is consumed here. The bounded byte pins cannot
// be caller-replaced to silently bless a new source/snapshot/Production registry.
export function classifyBatch(sourceBytes, unitsBytes) {
  gate(sha256(sourceBytes) === pins.sourceSha256, 'SOURCE_HASH_DRIFT');
  gate(sha256(unitsBytes) === pins.unitsSha256, 'PRODUCTION_HASH_DRIFT');
  const source = JSON.parse(sourceBytes), units = JSON.parse(unitsBytes);
  gate(source.format === 'wh3-reviewed-research-source-v1', 'SOURCE_FORMAT_UNSUPPORTED');
  gate(source.originalExtraction?.sha256 === pins.originalExtractionSha256, 'ORIGINAL_EXTRACTION_DRIFT');
  for (const field of ['gameVersion', 'rpfmVersion', 'schemaFormatVersion', 'schemaSha256'])
    gate(source.provenance?.[field] === pins[field], 'SNAPSHOT_PROVENANCE_DRIFT');
  gate(sha256(JSON.stringify(source.schemas)) === pins.processedSchemasSha256, 'PROCESSED_SCHEMA_DRIFT');
  gate(source.provenance.packs.length === 2, 'PACK_PROVENANCE_DRIFT');
  for (const [name, hash] of Object.entries(pins.packs)) gate(source.provenance.packs.filter(p =>
    p.file_name === name && p.sha256 === hash).length === 1, 'PACK_PROVENANCE_DRIFT');
  gate(digest(snapshotIdentity(source.provenance)) === pins.snapshotId, 'SNAPSHOT_IDENTITY_DRIFT');
  const ids = new Set();
  for (const row of source.rows) {
    gate(!ids.has(row.id), 'DUPLICATE_ROW_REFERENCE'); ids.add(row.id);
    gate(row.id === `${row.table}:${sha256(JSON.stringify([row.sourcePack, row.path, row.key, row.row])).slice(0,20)}`, 'CONFLICTING_ROW_PAYLOAD');
    const pack = source.provenance.packs.find(p => p.file_name === row.sourcePack);
    gate(row.sourcePack === (row.table === 'Loc' ? 'local_en.pack' : 'db.pack') &&
      pack?.file_path === row.sourcePackPath, 'ROW_PROVENANCE_MISSING');
  }
  const g = graph(source), technologies = [];
  gate(equal(sorted(source.rows.filter(r => r.table === 'technologies_tables').map(r => r.row.key)), sorted(technologyKeys)), 'TECHNOLOGY_BATCH_DRIFT');
  for (const key of technologyKeys) {
    const tech = g.one('technologies_tables', 'key', key), loc = g.loc(tech, 'onscreen_name');
    gate(tech.row.is_hidden === false, 'HIDDEN_TECHNOLOGY');
    const node = g.one('technology_nodes_tables', 'technology_key', key);
    const set = g.one('technology_node_sets_tables', 'key', node.row.technology_node_set);
    const culture = g.one('cultures_tables', 'key', set.row.culture);
    gate(node.row.campaign_key === '' && node.row.faction_key === '' && set.row.campaign_key === '' &&
      set.row.faction_key === '' && set.row.subculture === '' && set.row.key === 'brt_mil' &&
      culture.row.key === 'wh_main_brt_bretonnia', 'TECHNOLOGY_AVAILABILITY_UNVERIFIED');
    const technology = { key, name: loc.row.text, localisationRowId: loc.id, availability: [
      g.join(node, 'technology_key', tech, 'key'), g.join(node, 'technology_node_set', set, 'key'), g.join(set, 'culture', culture, 'key')] };
    const junctions = g.rows('technology_effects_junction_tables', 'technology', key);
    g.covered('technology_effects_junction_tables', 'technology', key, junctions.length);
    const effects = junctions.map(j => classifyResearchEffect(source, units, technology, j));
    const summary = breakdown(effects);
    technologies.push({ ...technology, summary, mixed: Object.values(summary).filter(n => n > 0).length > 1, effects });
  }
  const effects = technologies.flatMap(t => t.effects), candidates = effects.flatMap(e => e.candidates);
  return { format: 'wh3-research-candidate-report-v1', candidateOnly: true,
    whitelistSha256: sha256(JSON.stringify({ technologyKeys, ownForceScope, operations, effectMappings,
      rejectedEffects, membershipFields, selectorFields, baseRuleIds })),
    source: { sourcePath: 'tools/wh3-importer/research-batch-01/source.json', ...pins, provenance: source.provenance },
    summary: { technologyCount: technologies.length, effectCount: effects.length, ...breakdown(effects),
      candidateCount: candidates.length, candidatesPerUnit: counts(candidates.map(c => c.mainKey)),
      rejectionReasons: counts(effects.flatMap(e => e.reasonIds)),
      omittedTargetReasons: counts(effects.flatMap(e => e.omittedTargets.flatMap(t => t.reasonIds))),
      policyRuleUsage: counts(candidates.flatMap(c => c.ruleIds)) }, technologies };
}
