const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const App = require('../.test-build/src/App.js').default;
const { comparisonUnit, comparisonOptions } = require('../.test-build/src/repositories/productionUnitSelection.js');
const { caResearchEffects, calculateResearchAndManual: calculateSelected, researchModifiers: modifiersSelected, modifierSourceLabel: sourceSelected } = require('../.test-build/src/domain/caResearchEffect.js');
const research = caResearchEffects[0];
// Original single-slice assertions retained against the identical first entry.
const calculate = (unit, rows, selected) => calculateSelected(unit, rows, selected ? [research.researchKey] : []);
const researchModifiers = unit => modifiersSelected(unit, [research.researchKey]);
const modifierSourceLabel = (id, selected) => sourceSelected(id, selected ? [research.researchKey] : []);
const { wikiRepository: wiki } = require('../.test-build/src/repositories/wikiRepository.js');
const { memoryIndexedDb } = require('./fixtures/memoryIndexedDb.cjs');
const grail = comparisonUnit('ca_unit_wh_main_brt_cav_grail_knights');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceBytes = readFileSync('tools/wh3-importer/research-slice/source.json');
const admission = JSON.parse(readFileSync('tools/wh3-importer/research-slice/admission.json'));
const row = { id: 'manual-test', stat: 'melee.meleeAttack', operation: 'add', value: '8' };

test('actual CA research replay preserves exact identity/localisation/scope/membership/value/ADD mapping', async () => {
  const { reviewResearch } = await import('../tools/wh3-importer/research-slice/review.mjs');
  const first = reviewResearch(sourceBytes, admission);
  assert.deepEqual(first, reviewResearch(sourceBytes, admission));
  assert.equal(JSON.stringify(first.review, null, 2) + '\n', readFileSync('tools/wh3-importer/research-slice/review.json', 'utf8'));
  assert.deepEqual(first.projection, research);
  assert.equal(first.review.status, 'VERIFIED');
  assert.equal(research.name, 'Regular Tournaments');
  assert.equal(research.researchKey, 'wh_dlc07_tech_brt_economy_industry_tournaments');
  assert.equal(research.sourceKind, 'CA_RESEARCH');
  assert.equal(research.unitId, grail.id);
  assert.deepEqual(research.scope, { key: 'faction_to_force_own_unseen', location: 'factionwide', ownership: 'yours', source: 'faction', target: 'force', territory: 'any' });
  assert.deepEqual(research.modifiers.map(m => [m.stat, m.operation, m.value]), [['melee.meleeAttack', 'add', 5], ['defense.meleeDefense', 'add', 5]]);
});

test('CA source/schema/scope/identity/value/hash/snapshot mutation requires re-review', async () => {
  const { reviewResearch } = await import('../tools/wh3-importer/research-slice/review.mjs');
  const original = JSON.parse(sourceBytes);
  const edit = (table, field, value) => s => { s.rows.find(r => r.table === table).row[field] = value; };
  const mutations = [
    edit('technologies_tables', 'key', 'wrong'),
    edit('technology_effects_junction_tables', 'effect', 'wrong'),
    edit('technology_effects_junction_tables', 'value', 6),
    edit('technology_effects_junction_tables', 'effect_scope', 'wrong'),
    edit('campaign_effect_scopes_tables', 'ownership', 'enemy'),
    edit('effect_bonus_value_ids_unit_sets_tables', 'unit_set', 'all_units'),
    edit('unit_set_to_unit_junctions_tables', 'exclude', true),
    edit('main_units_tables', 'land_unit', 'wrong'),
    s => { s.rows.find(r => r.table === 'Loc').row.text = 'Wrong name'; },
    s => { s.schemas.find(d => d.table === 'technology_effects_junction_tables').fields.find(f => f.name === 'effect').is_reference = ['wrong', 'key']; },
    s => { s.relationships.pop(); },
    s => { s.provenance.packs[0].sha256 = '0'.repeat(64); },
    s => { s.provenance.schemaSha256 = '0'.repeat(64); },
    s => { s.provenance.gameVersion = 'wrong'; },
    s => { s.originalExtraction.sha256 = '0'.repeat(64); },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(original); mutate(changed);
    assert.throws(() => reviewResearch(Buffer.from(JSON.stringify(changed)), admission), /Source drift/);
  }
  for (const field of ['sourceSha256', 'originalExtractionSha256', 'snapshotId', 'researchKey', 'unitId', 'mainKey', 'landKey']) {
    assert.throws(() => reviewResearch(sourceBytes, { ...admission, [field]: 'wrong' }), field);
  }
  // Even repinning bytes does not bypass the fixed snapshot/semantic guards.
  const changed = structuredClone(original); changed.provenance.gameVersion = 'wrong';
  const bytes = Buffer.from(JSON.stringify(changed));
  assert.throws(() => reviewResearch(bytes, { ...admission, sourceSha256: hash(bytes) }));
});

test('Grail calculator uses existing engine: base/research/manual stacking/deselect/unknown/immutable', () => {
  const before = JSON.stringify(grail), projectionBefore = JSON.stringify(research);
  assert.equal(calculate(grail, [], false).unit.melee.meleeAttack, 38);
  const applied = calculate(grail, [], true);
  assert.equal(applied.unit.melee.meleeAttack, 43);
  assert.equal(applied.unit.defense.meleeDefense, 39);
  assert.equal(applied.breakdown.find(b => b.stat === 'melee.meleeAttack').flat, 5);
  for (const m of research.modifiers) {
    assert.equal(modifierSourceLabel(m.id, true), 'WH3 Research · Regular Tournaments');
    assert.equal(modifierSourceLabel(m.id, false), 'Manual');
  }
  assert.equal(modifierSourceLabel(row.id, true), 'Manual');
  assert.equal(calculate(grail, [row], true).unit.melee.meleeAttack, 51);
  assert.equal(calculate(grail, [row], false).unit.melee.meleeAttack, 46);
  assert.equal(calculate(grail, [row], true).modifiers.length, 1);
  assert(calculate(grail, [{ ...row, value: '' }], true).error);
  const unknown = structuredClone(grail); delete unknown.melee.meleeAttack;
  assert.equal(calculate(unknown, [], true).unit.melee.meleeAttack, undefined);
  assert.equal(calculate(unknown, [], true).breakdown.find(b => b.stat === 'melee.meleeAttack').status, 'unknown');
  assert.throws(() => researchModifiers({ ...grail, id: 'wrong' }));
  assert.throws(() => researchModifiers({ ...grail, gameVersion: 'wrong' }));
  const modifiers = researchModifiers(grail); modifiers[0].value = 999;
  assert.equal(JSON.stringify(grail), before); assert.equal(JSON.stringify(research), projectionBefore);
});

test('research UI and Profile storage keep CA research read-only and separate from manual/backup', async () => {
  const render = id => renderToString(React.createElement(MemoryRouter, { initialEntries: [`/calculator?unit=${id}`] }, React.createElement(App)));
  const html = render(grail.id);
  for (const label of ['Regular Tournaments', 'WH3 Research', 'read-only', research.researchKey, '수동 Modifier Profile']) assert(html.includes(label));
  assert(!render('ca_unit_wh_main_emp_inf_swordsmen').includes('Regular Tournaments'));
  global.indexedDB = memoryIndexedDb();
  const result = calculate(grail, [row], true);
  const saved = await wiki.saveManualProfile({ name: 'Research remains separate', unitId: grail.id, modifiers: result.modifiers });
  assert.deepEqual(saved.modifiers.map(m => m.id), ['manual-test']);
  assert(!JSON.stringify(saved).includes('ca-research:'));
  await wiki.deleteManualProfile(saved.id);
});

test('protected Production/Sample/admission/diagnostic/shared identities retain baseline bytes', () => {
  const expected = {
    'units.json': 'da22d7eb4d6af13856274e3f81fe18c789ed6588b6e0c956cbf97583f1350dc1',
    'unitSpeedAdmissions.json': '2c397f2677e78c92bf9fc91c6c82c1dc43c19798e5c43335872b954f29a1e8dd',
    'unitHpAdmissions.json': '2d4e0e79e755086170358325427bfa6d6395f2d6162ba250f83b0404b21a17bd',
    'unitDiagnostics.json': '1abbe4b8251320e86dbe7470bf3cf3729b7759c7c71af2af2b5b9f4ce680bb1f',
    'unitSharedIdentities.json': '3e256bf5c850df65e70a539062a5109a36c75757f8f3a34bc75d8b492aa9d13e',
  };
  for (const [file, sha] of Object.entries(expected)) assert.equal(hash(readFileSync(`src/data/${file}`)), sha, file);
  assert.equal(comparisonOptions().length, 101);
  assert.equal(JSON.parse(readFileSync('src/data/units.json')).filter(u => u.gameVersion === 'sample').length, 5);
});
