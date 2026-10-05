const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const setup = Promise.all([
  import('../tools/wh3-importer/resistance-research/replay.mjs'),
  import('../tools/wh3-importer/resistance-research/research.mjs'),
  import('../tools/wh3-importer/research-classifier/classify.mjs'),
]).then(([replay, research, hash]) => {
  const manifest = JSON.parse(fs.readFileSync('tools/wh3-importer/resistance-research/manifest.json'));
  return {manifest, fixture: replay.replay(manifest), research, hash};
});

test('Secrets exact owner, rank, effect, scope, priority and targets reconstruct from CA source', async () => {
  const {fixture: {result}} = await setup, t = result.trace;
  assert.equal(t.skillKey, 'wh_dlc07_skill_brt_fay_battle_secrets_of_the_grail');
  assert.equal(t.effectKey, 'wh_dlc07_effect_force_stat_magic_resistance_battle_pilgrims');
  assert.deepEqual(t.admissionOwnerKeys, ['wh_dlc07_brt_fay_enchantress']);
  assert.equal(t.rank, 1); assert.equal(t.rawValue, 20); assert.equal(t.effectPriority, 581);
  assert.equal(t.scope.key, 'general_to_force_own');
  assert.equal(t.typedRoute.raw.bonus_value_id, 'unit_damage_resistance_magic_mod');
  assert.equal(t.targetMaterialization.productionMembers.length, 1);
  assert.equal(t.targetMaterialization.omittedNonProduction.length, 2);
  assert.deepEqual(t.classifier.blockers, ['NO_VERIFIED_NUMERIC_MAPPING', 'UNREVIEWED_RESISTANCE_OPERATION']);
});

test('at least five independent used comparison effects share the exact typed spell bonus, not a name pattern', async () => {
  const {fixture: {result}} = await setup, c = result.comparisons;
  assert.equal(c.comparisonEffects, 7); assert.equal(c.usedIndependentComparisonEffects, 5);
  assert.equal(c.comparisonConsumerRows, 84);
  assert(c.effects.every(e => e.sameExactBonus === 'unit_damage_resistance_magic_mod' && e.declaredOperation === null && e.runtime === 'NOT_OBSERVED'));
  assert.deepEqual(c.exactEffectReuse, {character_skill_level_to_effects_junctions_tables: 1, technology_effects_junction_tables: 0, trait_level_effects_tables: 0, effect_bundles_to_effects_junctions_tables: 0});
  assert.deepEqual(c.valueRepresentation.values, [5, 10, 15, 20, 25, 30, 35, 50]);
  assert.equal(c.valueRepresentation.negativeExamples, 0);
  assert.deepEqual(c.reviewedExistingSameBonusAdmissions, []);
});

test('ability-phase explicit ADD is not transferred to an unrelated campaign bonus implementation', async () => {
  const {fixture: {result}} = await setup, s = result.semantics;
  assert.deepEqual(result.comparisons.phaseCounterexamples.map(p => [p.stat, p.value, p.how, p.transfersToCampaignBonus]), [['stat_resistance_magic', 20, 'add', false]]);
  assert(s.schemaInspection.every(t => t.explicitOperationFields.length === 0));
  assert.equal(s.bonusDefinitionQuery.tableFiles, 0);
  assert.equal(s.directOperationProofForExactCampaignBonus, false);
  assert.equal(s.verdict, 'E'); assert.equal(s.operation, null); assert.equal(s.runtimeObservation, 'NOT_OBSERVED');
});

test('raw damage-modifier zero and UI range do not authorize a displayed resistance baseline or effective cap', async () => {
  const {fixture: {result}} = await setup, s = result.semantics;
  assert.equal(s.baseStat.rawValue, 0); assert.equal(s.baseStat.displayedSpellBase, null);
  assert.equal(s.baseStat.displayedSpellBaseStatus, 'UNAVAILABLE');
  assert.equal(s.baseStat.rawToDisplayConversion, 'UNKNOWN'); assert.equal(s.baseStat.missingProductionBaseIsZero, false);
  assert.equal(s.uiStat.raw.max_value, 100); assert.equal(s.uiStat.raw.clamp_displayed_maximum, false);
  assert.equal(s.wholeSkillGate.admission, 'HOLD'); assert.equal(s.wholeSkillGate.admittedSkills, 0);
  assert(s.wholeSkillGate.remainingBlockers.includes('TARGET_BASE_SPELL_RESISTANCE_NOT_ADMITTED'));
  assert.deepEqual(s.wholeSkillGate.effectiveModifiers, []);
});

test('bounded supplemental source rejects snapshot drift, payload drift, duplicate and missing references', async () => {
  const {fixture, research} = await setup;
  const wrongVersion = structuredClone(fixture.supplement); wrongVersion.provenance.gameVersion = 'wrong';
  assert.throws(() => research.verifySupplement(fixture.prior, wrongVersion));
  const changed = structuredClone(fixture.supplement); changed.rows[0].row.value = 999;
  assert.throws(() => research.verifySupplement(fixture.prior, changed));
  const duplicate = structuredClone(fixture.supplement); duplicate.rows.push(duplicate.rows[0]);
  assert.throws(() => research.verifySupplement(fixture.prior, duplicate));
  const missing = structuredClone(fixture.supplement); missing.reusedRowIds[0] = 'absent-source-row';
  assert.throws(() => research.verifySupplement(fixture.prior, missing));
});

test('existing engine preserves actual missing resistance under all hypotheses; predictions remain synthetic', async () => {
  const {fixture: {units, result}} = await setup;
  const {applyModifiersWithBreakdown} = require('../.test-build/src/domain/unitModifiers.js');
  const unit = units.find(u => u.id === result.semantics.baseStat.unitId), before = JSON.stringify(unit);
  for (const operation of ['add', 'multiply', 'set']) {
    const computed = applyModifiersWithBreakdown(unit, [{id: 'synthetic_hypothesis', stat: 'defense.resistances.spell', operation, value: 20}]);
    assert.equal(computed.breakdown[0].status, 'unknown'); assert.equal(computed.breakdown[0].result, undefined);
    assert.equal(computed.unit.defense.resistances, undefined);
  }
  const hypothetical = structuredClone(unit); hypothetical.defense.resistances = {spell: 90};
  const uncapped = applyModifiersWithBreakdown(hypothetical, [{id: 'synthetic_add_only', stat: 'defense.resistances.spell', operation: 'add', value: 20}]);
  assert.equal(uncapped.unit.defense.resistances.spell, 110);
  assert(result.semantics.candidatePredictions.every(p => p.observed === false));
  assert.equal(JSON.stringify(unit), before);
});

test('pipeline feedback counts exact-bonus junctions separately and all output hashes replay without old file changes', async () => {
  const {manifest, fixture, hash} = await setup, f = fixture.result.feedback;
  assert.deepEqual(f.fullInventory, {skills: 226, ranks: 434, junctions: 840});
  assert.equal(f.broadResistanceFamily.junctions, 10); assert.equal(f.broadResistanceFamily.distinctEffects, 8);
  assert.equal(f.exactBonusFamily.junctions, 1); assert.equal(f.exactBonusFamily.releasedOperationJunctions, 0);
  assert.equal(f.exactBonusFamily.otherJunctionsReleased, 0); assert.equal(f.multiRankVerdict, 'UNKNOWN_UNCHANGED');
  assert.deepEqual(f.newAdmission, {skills: 0, effects: 0, modifiers: 0});
  assert.equal(Object.keys(manifest.preservedFiles).length, 532);
  for (const [name, bytes] of Object.entries(fixture.outputs)) {
    assert.equal(hash.sha256(bytes), manifest.outputSha256[name]);
    assert.equal(fs.readFileSync(`tools/wh3-importer/resistance-research/${name}.json`, 'utf8'), bytes);
  }
});
