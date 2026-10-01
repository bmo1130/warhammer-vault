import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { materializeCatalogRequest, summarizeMaterializations, diagnosticFactionIds } from './materialize.mjs';
import { approvedCatalogContext, assertCatalogSnapshot } from './normalization-context.mjs';
import { normalizeUnit } from '../normalization/normalizer.mjs';
import { loadUnitValidator } from '../normalization/validation.mjs';
import { curatedDecisions } from './decisions.mjs';
import { catalogEntryId, classifyCatalogCandidates } from './policy.mjs';

const directory = process.env.WH3_CONTEXT_MATERIALIZATION_DIR;
const options = { skip: directory ? false : 'Run materialize-cli.mjs and set WH3_CONTEXT_MATERIALIZATION_DIR to its COMPLETE output.' };
const read = async file => JSON.parse(await readFile(path.join(directory, file), 'utf8'));
async function actual() {
  const manifest = await read('manifest.json');
  assert.equal(manifest.status, 'COMPLETE'); assert.equal(manifest.fullImport, false); assert.equal(manifest.gameExecuted, false);
  const results = await Promise.all(manifest.results.map(r => read(r.file)));
  assert.equal(results.length, 19);
  for (const r of results) assertCatalogSnapshot(r.dump.sourceKind, r.dump.provenance, manifest.provenance, 'ca-pack');
  return { manifest, results };
}
test('actual 19 exact context requests complete with independent source traces and zero diagnostic validation failures', options, async () => {
  const { manifest, results } = await actual();
  assert.deepEqual(summarizeMaterializations(results), manifest.metrics);
  for (const field of ['attempted', 'planReady', 'traced', 'normalized', 'validated', 'materialized', 'partial']) assert.equal(manifest.metrics[field], 19);
  assert.equal(manifest.metrics.blocked, 0); assert.equal(manifest.metrics.validationFailures, 0);
  assert.equal(manifest.metrics.defaultVisible, 12); assert.equal(manifest.metrics.contextOnly, 7); assert.equal(manifest.metrics.productionEligible, 0);
  assert.equal(new Set(results.map(r => r.unit.id)).size, 19);
  for (const r of results) {
    assert.equal(r.status, 'MATERIALIZED'); assert.equal(r.quality, 'PARTIAL');
    assert.equal(r.dump.discovery.policy, 'exact-main'); assert.equal(r.dump.discovery.candidates.length, 1);
    assert.equal(r.dump.unit.caKey, r.request.mainKey); assert.equal(r.tracedIdentity.mainKey, r.request.mainKey);
    assert.equal(r.unit.id, catalogEntryId(r.request.mainKey, r.request.contextId));
    assert.equal(r.unit.factionId, r.plan.presentation.factionId);
    assert.equal(r.provenance.catalog.contextId, r.request.contextId);
    assert.equal(r.provenance.catalog.sourceMainKey, r.request.mainKey);
    assert.equal(r.provenance.catalog.sourceLandKey, r.tracedIdentity.landKey);
    assert.deepEqual(r.unit, r.normalized.unit); assert.equal(r.productionEligible, false);
    assert.equal(r.dump.rows.filter(x => x.table === 'main_units_tables').length, 1);
    assert.equal(r.dump.rows.filter(x => x.table === 'land_units_tables').length, 1);
    const proof = classifyCatalogCandidates([r.planEvidence.candidate], r.planEvidence.evidence);
    assert.deepEqual(approvedCatalogContext(proof, r.request).plan, r.plan);
  }
});
test('actual shared-land Empire pairs preserve separate main costs, context IDs and provenance', options, async () => {
  const { results } = await actual();
  const pairs = [['wh_main_emp_art_helstorm_rocket_battery', 'wh2_dlc13_emp_art_helstorm_rocket_battery_imperial_supply'],
    ['wh_main_emp_inf_handgunners', 'wh2_dlc13_emp_inf_handgunners_imperial_supply'],
    ['wh_main_emp_veh_steam_tank', 'wh2_dlc13_emp_veh_steam_tank_imperial_supply']];
  for (const keys of pairs) {
    const [a, b] = keys.map(key => results.find(r => r.request.mainKey === key));
    assert.equal(a.tracedIdentity.landKey, b.tracedIdentity.landKey); assert.notEqual(a.unit.id, b.unit.id);
    assert.notEqual(a.provenance.catalog.contextId, b.provenance.catalog.contextId);
    assert.notEqual(a.provenance.catalog.sourceMainKey, b.provenance.catalog.sourceMainKey);
    assert.equal(a.provenance.catalog.defaultVisible, true); assert.equal(b.provenance.catalog.defaultVisible, false);
    for (const r of [a, b]) {
      const field = r.provenance.fields.find(f => f.field === 'campaign.recruitmentCost');
      assert.equal(field.source.rowKey.unit, r.request.mainKey);
      assert.equal(field.value, r.dump.rows.find(x => x.id === r.dump.rootRow).row.recruitment_cost);
    }
  }
});
test('actual independent faction roots and all seven context-only roots survive materialization', options, async () => {
  const { results } = await actual();
  for (const keys of [
    ['wh_dlc03_bst_inf_chaos_warhounds_0', 'wh_main_chs_mon_chaos_warhounds_0'],
    ['wh_main_vmp_mon_crypt_horrors', 'wh2_dlc09_tmb_mon_crypt_horrors'],
    ['wh_main_vmp_cav_hexwraiths', 'wh2_dlc09_tmb_cav_hexwraiths'],
  ]) {
    const [a, b] = keys.map(key => results.find(r => r.request.mainKey === key));
    assert.equal(a.unit.name, b.unit.name); assert.notEqual(a.unit.id, b.unit.id); assert.notEqual(a.unit.factionId, b.unit.factionId);
    assert(a.plan.presentation.defaultVisible && b.plan.presentation.defaultVisible);
  }
  const contexts = results.filter(r => !r.plan.presentation.defaultVisible);
  assert.equal(contexts.length, 7);
  assert(contexts.every(r => r.status === 'MATERIALIZED' && !r.productionEligible && r.productionReasons.includes('CONTEXT_ONLY_PRESENTATION')));
});
test('actual mapped fields resolve back to raw rows without mixing catalog metadata into Unit field counters', options, async () => {
  const { results } = await actual();
  for (const r of results) {
    assert.equal(r.provenance.fields.find(f => f.field === 'id').kind, 'GENERATED');
    assert.equal(r.provenance.fields.find(f => f.field === 'factionId').kind, 'CURATED');
    assert.equal(r.provenance.catalog.kind, 'CURATED'); assert.equal(r.provenance.catalog.idKind, 'GENERATED');
    assert(!r.provenance.fields.some(f => f.field.startsWith('catalog.') || f.field === 'contextId'));
    for (const field of r.provenance.fields) {
      const row = [...r.dump.rows, ...r.discovery.evidence.rows].find(x => x.id === field.source.rowId);
      assert(row && row.row[field.source.field] === field.rawValue, `${r.request.mainKey}.${field.field}`);
      assert.equal(field.value, field.field.split('.').reduce((o, key) => o?.[key], r.unit));
    }
    for (const field of ['count', 'totalHealth', 'healthPerEntity']) assert.equal(r.unit.entities[field], undefined);
    assert.equal(r.unit.movement.speed, undefined); assert.equal(r.unit.missile?.ammunition, undefined);
  }
});
test('actual roster values agree with legacy normalization except explicitly withheld missile fields retained in sidecar provenance', options, async () => {
  const { results } = await actual();
  for (const r of results.filter(r => r.plan.presentation.defaultVisible)) {
    const decision = curatedDecisions.find(d => d.mainKey === r.request.mainKey);
    const militaryGroup = decision.checks.find(c => c.table === 'units_to_groupings_military_permissions_tables').equals.military_group;
    const legacy = normalizeUnit(r.dump, { militaryGroup, factionId: r.unit.factionId, permissionTrace: r.discovery.evidence });
    const gated = normalizeUnit(r.dump, { militaryGroup, factionId: r.unit.factionId, permissionTrace: r.discovery.evidence, missileInspection: r.missileInspection, entityInspection: r.entityInspection });
    assert.deepEqual({ ...r.unit, id: gated.unit.id }, gated.unit);
    assert.deepEqual(r.omissions, gated.omitted); assert.deepEqual(r.unmapped, legacy.unmapped);
    const withheld = r.normalized.missilePresentation?.withheldFields ?? [];
    const without = unit => { const { missile, ...rest } = unit; return rest; };
    assert.deepEqual(without({ ...r.unit, id: legacy.unit.id }), without(legacy.unit));
    assert.deepEqual(r.provenance.fields.filter(f => !['id', 'factionId'].includes(f.field) && !f.field.startsWith('missile.')),
      legacy.provenance.fields.filter(f => !['id', 'factionId'].includes(f.field) && !f.field.startsWith('missile.')));
    if (withheld.length) {
      assert.equal(r.unit.missile, undefined);
      assert.deepEqual(withheld.map(f => [f.field, f.value, f.source]), legacy.provenance.fields.filter(f => f.field.startsWith('missile.')).map(f => [f.field, f.value, f.source]));
    } else assert.deepEqual(r.unit.missile, legacy.unit.missile);
  }
});
test('actual validation uses a diagnostic registry without altering or bypassing production faction registration', options, async () => {
  const { manifest, results } = await actual(), validate = await loadUnitValidator();
  const factions = JSON.parse(await readFile(new URL('../../../src/data/factions.json', import.meta.url), 'utf8'));
  assert.deepEqual(factions.map(f => f.id), ['vampire_counts']);
  assert.deepEqual(validate(results.map(r => r.unit), diagnosticFactionIds), []);
  assert.equal(manifest.metrics.productionValidationRejections, 14);
  for (const r of results) assert.deepEqual(r.validation.production.issues, validate([r.unit], factions.map(f => f.id)));
});
test('actual saved plan refuses changed game/schema/pack snapshots before any reader access', options, async () => {
  const { manifest, results: [first] } = await actual(), validate = await loadUnitValidator();
  const review = classifyCatalogCandidates([first.planEvidence.candidate], first.planEvidence.evidence);
  for (const field of ['gameVersion', 'schemaSha256', 'packs']) {
    const metadata = structuredClone(manifest.provenance);
    if (field === 'packs') metadata.packs[0].sha256 = 'changed'; else metadata[field] = 'changed';
    let reads = 0;
    const source = { metadata, reader: { tables: async () => { reads++; throw new Error('Unexpected source read'); } } };
    const r = await materializeCatalogRequest(source, review, first.request, validate);
    assert.equal(r.status, 'BLOCKED_SOURCE_DRIFT'); assert.equal(r.unit, null); assert.equal(reads, 0);
  }
});
