import assert from 'node:assert/strict';
import {sha256} from '../research-classifier/classify.mjs';
import {unique} from '../skill-production-bretonnia/source.mjs';
import {numericRules} from '../skill-production-bretonnia/classify.mjs';
import {blockedMappings} from '../normalization/policy.mjs';
import {skillKey, effectKey, bonusKey, statKey, comparisonEffectKeys, resistanceBonuses, usageTables} from './policy.mjs';

export function verifySupplement(prior, supplement) {
  assert.equal(supplement.format, 'wh3-resistance-source-v1');
  assert.equal(supplement.provenance.gameVersion, prior.provenance.gameVersion);
  assert.equal(supplement.provenance.schemaSha256, prior.provenance.schemaSha256);
  assert.deepEqual(supplement.comparisonEffectKeys, comparisonEffectKeys);
  for (const pack of prior.provenance.packs) assert(supplement.provenance.packs.some(p => p.file_name === pack.file_name && p.sha256 === pack.sha256));
  const all = new Map(prior.rows.map(r => [r.id, r]));
  assert.equal(new Set(supplement.reusedRowIds).size, supplement.reusedRowIds.length);
  const selected = supplement.reusedRowIds.map(id => { assert(all.has(id), `Missing reused row ${id}`); return all.get(id); });
  for (const r of supplement.rows) {
    assert(!all.has(r.id), `Duplicate supplemental row ${r.id}`);
    const schema = supplement.schemas.find(s => s.table === r.table && s.version === r.tableVersion);
    assert(schema, `Missing supplemental schema ${r.table}`);
    assert.deepEqual(Object.keys(r.row).sort(), schema.fields.map(f => f.name).sort());
    assert.deepEqual(r.key, Object.fromEntries(schema.fields.filter(f => f.is_key).map(f => [f.name, r.row[f.name]])));
    assert.equal(r.id, `${r.table}:${sha256(JSON.stringify([r.sourcePack, r.path, r.key, r.row])).slice(0, 20)}`, 'Supplemental row identity drift');
    all.set(r.id, r); selected.push(r);
  }
  assert(selected.length <= 600);
  for (const query of supplement.coverage) {
    const selectedMatches = selected.filter(r => r.table === query.table && Object.entries(query.where).every(([f, values]) => values.includes(r.row[f])));
    assert.equal(selectedMatches.length, query.retainedRows, `Incomplete query ${query.table}`);
    if (query.selection === 'All exact matches') assert.equal(query.retainedRows, query.matchedRows);
  }
  return {all, selected};
}

export function research(prior, supplement, inventory, classification, memberships, units) {
  const {all, selected} = verifySupplement(prior, supplement);
  const rows = table => selected.filter(r => r.table === table);
  const one = (table, field, value) => {
    const matches = [...all.values()].filter(r => r.table === table && r.row[field] === value);
    assert.equal(matches.length, 1, `Ambiguous ${table}.${field}=${value}`); return matches[0];
  };
  const skill = inventory.skills.find(s => s.key === skillKey);
  const current = classification.skills.find(s => s.skillKey === skillKey);
  assert(skill && current); assert.deepEqual(skill.rankLevels, [1]); assert.equal(skill.effects.length, 1);
  const effect = skill.effects[0], definition = one('effects_tables', 'effect', effectKey);
  assert.equal(effect.effectKey, effectKey); assert.equal(effect.rawValue, 20);
  assert.equal(effect.routes.length, 1); assert.equal(effect.routes[0].raw.bonus_value_id, bonusKey);
  const route = effect.routes[0], membership = memberships.find(m => m.key === route.selectorKey);
  assert.equal(membership.status, 'STATIC_EXACT_MEMBERSHIP');
  const target = current.effects[0].targets[0], unit = units.find(u => u.id === target.unitId);
  const main = one('main_units_tables', 'unit', target.mainKey);
  const land = one('land_units_tables', 'key', target.landKey);
  assert.equal(main.row.land_unit, land.row.key);
  assert.equal(unit.gameVersion, prior.provenance.gameVersion);
  const schema = (table, version) => supplement.schemas.find(s => s.table === table && s.version === version) ?? prior.schemas.find(s => s.table === table && s.version === version);
  const consumers = rows('character_skill_level_to_effects_junctions_tables').concat(rows('technology_effects_junction_tables'), rows('trait_level_effects_tables'), rows('effect_bundles_to_effects_junctions_tables'));
  const comparisons = comparisonEffectKeys.map(key => {
    const d = one('effects_tables', 'effect', key);
    const routes = rows('effect_bonus_value_ids_unit_sets_tables').filter(r => r.row.effect === key);
    assert(routes.length && routes.every(r => r.row.bonus_value_id === bonusKey));
    assert.deepEqual(schema(d.table, d.tableVersion).fields.find(f => f.name === 'effect').is_reference, null);
    const usages = consumers.filter(r => r.row[usageTables[r.table]] === key);
    for (const r of usages) {
      assert(Number.isFinite(r.row.value));
      const ref = schema(r.table, r.tableVersion).fields.find(f => f.name === usageTables[r.table]).is_reference;
      assert.deepEqual(ref, ['effects', 'effect']);
    }
    return {effectKey: key, sameExactBonus: bonusKey, definitionRowId: d.id, priority: d.row.priority,
      description: one('Loc', 'key', 'effects_description_' + key).row.text,
      positiveIsGoodUiFlag: d.row.is_positive_value_good, priorityMeaning: 'UI_ORDER_ONLY',
      routeRowIds: routes.map(r => r.id), unitSetKeys: unique(routes.map(r => r.row.unit_set)),
      usageCounts: Object.fromEntries(Object.keys(usageTables).map(t => [t, usages.filter(r => r.table === t).length])),
      rawValues: unique(usages.map(r => r.row.value)).sort((a, b) => a - b), scopes: unique(usages.map(r => r.row.effect_scope)),
      usages: usages.map(r => ({rowId: r.id, table: r.table, sourceKey: r.key, rawValue: r.row.value, scope: r.row.effect_scope})),
      declaredOperation: null, runtime: 'NOT_OBSERVED', operationEvidence: 'SAME_TYPED_BONUS_NO_DECLARED_OPERATION',
      definitionOnlyInQueriedUsageTables: usages.length === 0};
  });
  const phaseExamples = rows('special_ability_phase_stat_effects_tables').map(r => ({rowId: r.id, ...r.row, sourceDeclaresHow: true, transfersToCampaignBonus: false,
    reason: 'Ability-phase how directly declares only this phase operation. No FK/declaration links it to the campaign unit-set bonus implementation.'}));
  const ui = one('ui_unit_stats_tables', 'key', statKey);
  const stat = one('modifiable_unit_stats_tables', 'stat_key', statKey);
  const statLoc = one('Loc', 'key', 'unit_stat_localisations_onscreen_name_' + statKey);
  assert.equal(ui.row.localisation, stat.row.localisation); assert.equal(stat.row.localisation, statKey);
  const schemaInspection = [
    one('character_skill_level_to_effects_junctions_tables', 'effect_key', effectKey), definition, all.get(route.rowId),
  ].map(r => ({table: r.table, version: r.tableVersion, fields: schema(r.table, r.tableVersion).fields,
    explicitOperationFields: schema(r.table, r.tableVersion).fields.filter(f => ['operation', 'how', 'multiplier', 'add', 'set'].includes(f.name)).map(f => f.name)}));
  assert(schemaInspection.every(s => s.explicitOperationFields.length === 0));
  const rawDamageField = schema('land_units_tables', land.tableVersion).fields.find(f => f.name === 'damage_mod_magic');
  const baselineAdmitted = Number.isFinite(unit.defense.resistances?.spell);
  const blockers = [...current.blockers, ...(!baselineAdmitted ? ['TARGET_BASE_SPELL_RESISTANCE_NOT_ADMITTED'] : []),
    'RAW_TO_DISPLAYED_SPELL_STAT_CONVERSION_UNCONFIRMED', 'CAMPAIGN_RESISTANCE_STACKING_AND_CAP_UNCONFIRMED'];
  const trace = {format: 'wh3-secrets-resistance-trace-v1', skillKey, skillName: skill.name, skillRowId: skill.sourceRowId,
    ownerKeys: skill.ownerKeys, admissionOwnerKeys: current.admissionOwnerKeys, ownerChains: skill.owners,
    rank: effect.rank, rankRows: skill.rankRows, effectKey, effectRowId: definition.id,
    effectJunctionRowId: effect.junctionRowId, rawValue: effect.rawValue, scope: effect.scope, scopeRowId: effect.scopeRowId,
    effectPriority: definition.row.priority, prioritySchemaDescription: schema(definition.table, definition.tableVersion).fields.find(f => f.name === 'priority').description,
    typedRoute: route, statIdentity: {bonusKey, candidatePath: 'defense.resistances.spell', uiStatKey: statKey, uiRowId: ui.id, modifiableStatRowId: stat.id, currentLabelRowId: statLoc.id, label: statLoc.row.text,
      campaignBonusToUiStatDeclarativeJoin: 'NOT_FOUND_IN_BOUNDED_SOURCE'},
    targetMaterialization: membership, classifier: current, historicalBlockersChanged: false};
  const comparisonReport = {format: 'wh3-spell-resistance-comparisons-v1', exactBonusFamily: bonusKey,
    comparisonEffects: comparisons.length, independentComparisonEffects: comparisons.length - 1,
    usedIndependentComparisonEffects: comparisons.filter(c => c.effectKey !== effectKey && !c.definitionOnlyInQueriedUsageTables).length,
    comparisonConsumerRows: consumers.length, exactEffectReuse: comparisons[0].usageCounts,
    valueRepresentation: {values: unique(consumers.map(r => r.row.value)).sort((a, b) => a - b), negativeExamples: consumers.filter(r => r.row.value < 0).length,
      raw1Examples: consumers.filter(r => r.row.value === 1).length, rawPoint1Examples: consumers.filter(r => r.row.value === 0.1).length,
      limitation: 'Only the seven exact effect keys and four usage tables were queried. Positive integer patterns/labels are not operation or direction proof.'},
    effects: comparisons, phaseCounterexamples: phaseExamples,
    reviewedExistingSameBonusAdmissions: Object.keys(numericRules).filter(k => k === bonusKey),
    noPhaseOrOtherResistanceTypeOperationTransfer: true};
  const semantics = {format: 'wh3-resistance-semantics-v1', verdict: 'E', operation: null, gameVersion: prior.provenance.gameVersion,
    runtimeObservation: 'NOT_OBSERVED', directOperationProofForExactCampaignBonus: false,
    schemaInspection, bonusDefinitionQuery: supplement.coverage.find(q => q.table === 'campaign_bonus_value_ids_unit_sets_tables'),
    baseStat: {unitId: unit.id, mainKey: main.row.unit, mainRowId: main.id, landKey: land.row.key, landRowId: land.id,
      sourceField: rawDamageField, rawValue: land.row.damage_mod_magic, rawDamageScale: 'Schema endpoints: 0 unaffected, -100 double damage, +100 negation; integer percentage-point scale',
      unitModelScale: 'UnitResistances stores percentage points: 20 = 20%, not 0.2',
      displayedSpellBase: baselineAdmitted ? unit.defense.resistances.spell : null, displayedSpellBaseStatus: baselineAdmitted ? 'ADMITTED' : 'UNAVAILABLE',
      missingProductionBaseIsZero: false, rawToDisplayConversion: 'UNKNOWN',
      normalizationGate: blockedMappings.find(([path]) => path === 'defense.resistances')},
    uiStat: {rowId: ui.id, raw: ui.row, meaning: 'Display metadata only. max_value=100 and displayed clamp flags do not prove battle/campaign effective clamp, stacking or raw conversion.'},
    resistanceEffectUnit: 'F32 value 20 in the campaign junction; percentage-labelled magnitude. ADD percentage points vs MULTIPLY percentage vs SET remains unproved.',
    engineFit: {add: 'Can express B + 20 if exact campaign ADD and stat conversion are proved', multiply: 'Can express B * 1.20 if exact percentage MULTIPLY is proved', set: 'Can express 20 for a known baseline if SET is proved',
      unknownBase: 'All operations retain unknown base in the existing engine, including SET', clamp: 'No resistance clamp in current engine; need proof of required semantics before selecting a supported operation', changed: false},
    candidatePredictions: [0, 10, 50, 90].map(base => ({hypotheticalKnownBasePercentagePoints: base, rawEffectValue: 20, add: base + 20, multiply: base * 1.2, set: 20, otherOrClamp: null, observed: false})),
    whyUnknown: ['No declared operation for the exact campaign bonus in its effect/junction/typed-route source', 'Same-bonus comparison consumers have no independent verified stat before/after readings',
      'Ability-phase how=add cannot establish a different campaign bonus implementation', 'Source damage_mod_magic zero is not an admitted displayed spell-resistance zero', 'Effective conversion, stacking and cap behavior are unobserved'],
    requiredRuntimeEvidence: ['Exact target main/land identity, game version, owner and rank; no other changing modifiers',
      'Independent displayed baseline, including a known nonzero baseline; zero alone cannot separate ADD from SET',
      'Secrets rank 1 on/off with that baseline; compare ADD/MULTIPLY/SET predictions',
      'Same exact bonus stacking and a boundary capture if a clamp can affect the projected result; distinguish UI display clamp from effective stat'],
    wholeSkillGate: {rankOne: true, exactOwner: current.admissionOwnerKeys, supportedScope: effect.scope.key === 'general_to_force_own',
      exactTargets: current.effects[0].targets, materializationUnresolved: membership.unresolvedCount,
      allUnitStatOperationsVerified: false, existingPath: 'defense.resistances.spell', wholeEffectCount: 1, omittedOrUnsupportedEffects: 0,
      omittedNonProductionTargets: membership.omittedNonProduction, partialAdmissionIntroduced: false, remainingBlockers: blockers,
      admission: 'HOLD', admittedSkills: 0, effectiveModifiers: []}};
  const family = inventory.skills.flatMap(s => s.effects.filter(e => e.routes.some(r => resistanceBonuses.includes(r.raw.bonus_value_id))).map(e => ({...e, skillKey: s.key})));
  const exact = family.filter(e => e.routes.some(r => r.raw.bonus_value_id === bonusKey));
  const feedback = {format: 'wh3-resistance-full-pipeline-feedback-v1', historicalClassifierChanged: false, automaticallyReadmitted: false,
    fullInventory: {skills: inventory.skills.length, ranks: inventory.skills.reduce((n, s) => n + s.rankLevels.length, 0), junctions: inventory.skills.reduce((n, s) => n + s.effects.length, 0)},
    broadResistanceFamily: {junctions: family.length, distinctEffects: unique(family.map(e => e.effectKey)).length, eligibleForProofTransfer: false},
    exactBonusFamily: {bonus: bonusKey, junctions: exact.length, effects: unique(exact.map(e => e.effectKey)).length,
      candidates: exact.map(e => ({skillKey: e.skillKey, effectKey: e.effectKey, junctionRowId: e.junctionRowId, blockers: classification.skills.flatMap(s => s.effects).find(c => c.junctionRowId === e.junctionRowId).blockers})),
      releasedOperationJunctions: 0, otherJunctionsReleased: 0,
      conditionalStatement: 'If this exact bonus operation is proved, one existing junction is a mapping review candidate. Production base/conversion gates and whole-Skill gate still apply. Other resistance types do not inherit proof.'},
    newAdmission: {skills: 0, effects: 0, modifiers: 0}, multiRankVerdict: 'UNKNOWN_UNCHANGED', characterSupportImplemented: false};
  return {trace, comparisons: comparisonReport, semantics, feedback};
}
