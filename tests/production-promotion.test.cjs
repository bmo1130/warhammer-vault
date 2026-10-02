const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { createHash } = require('node:crypto');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const { validateUnits } = require('../.test-build/src/domain/unitValidation.js');
const { getMeleeWeaponDamage } = require('../.test-build/src/domain/unitCalculations.js');
const { gameRepository: game } = require('../.test-build/src/repositories/gameRepository.js');
const { unitCatalogRepository: catalog } = require('../.test-build/src/repositories/unitCatalogRepository.js');
const { unitDiagnosticRepository: diagnostics } = require('../.test-build/src/repositories/unitDiagnosticRepository.js');
const { resolveSavedTargetName } = require('../.test-build/src/repositories/archivePresentation.js');
const App = require('../.test-build/src/App.js').default;
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const input = read('tools/wh3-importer/promotion/dragon-ogres.source.json');
const units = read('src/data/units.json'), factions = read('src/data/factions.json');
const sha = text => createHash('sha256').update(text).digest('hex');
const render = url => renderToString(React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(App))).replace(/<!--.*?-->/g, '');
const options = () => ({ evidence: structuredClone(input), units: structuredClone(units), factions: structuredClone(factions),
  diagnosticIds: diagnostics.list().map(entry => entry.id), validate: validateUnits });
const gate = () => import('../tools/wh3-importer/promotion/first-batch.mjs');

test('first static production source replays exactly and promotion is idempotent without mutating its inputs', async () => {
  const { buildFirstProductionBatch, firstProductionReview, evidenceHash } = await gate();
  assert.equal(evidenceHash(input), firstProductionReview.evidenceSha256);
  const supplied = options(), before = structuredClone(supplied.evidence);
  const batch = buildFirstProductionBatch(supplied);
  assert.deepEqual(batch.units, units);
  assert.deepEqual(batch.factions, factions);
  assert.deepEqual(batch.added, { units: 0, factions: 0 });
  assert.deepEqual(supplied.evidence, before);
  assert.deepEqual(supplied.units, units);
  assert.equal(batch.normalized.provenance.fields.filter(field => field.kind === 'DIRECT').length, 25);
  assert.equal(batch.normalized.omitted.length, 36);
  assert.deepEqual(batch.normalized.unmapped, []);
  const fromSamples = options();
  fromSamples.units = units.filter(unit => unit.gameVersion === 'sample');
  fromSamples.factions = factions.filter(faction => faction.gameVersion === 'sample');
  const appended = buildFirstProductionBatch(fromSamples);
  assert.deepEqual(appended.units, [...fromSamples.units, batch.unit]);
  assert.deepEqual(appended.factions, factions.filter(faction => ['vampire_counts','warriors_of_chaos'].includes(faction.id)));
  assert.deepEqual(appended.added, { units: 1, factions: 1 });
});

test('pinned saved-source gate refuses drift, fixtures, runtime/context status and source identity substitution', async () => {
  const { buildFirstProductionBatch } = await gate();
  const mutations = [
    evidence => { evidence.dump.sourceKind = 'fixture'; },
    evidence => { evidence.reviewedSource.pilotStatus = 'PARTIAL'; },
    evidence => { evidence.dump.unit.caKey = 'wh_main_vmp_inf_zombie'; },
    evidence => { evidence.dump.provenance.gameVersion = '9.0.3.0'; },
    evidence => { evidence.dump.provenance.packs[0].sha256 = 'a'.repeat(64); },
    evidence => { evidence.affiliation.factionId = 'vampire_counts'; },
    evidence => { evidence.productionEligible = true; evidence.runtime = 'OBSERVED_ONCE'; },
    evidence => { evidence.dump.rows.find(row => row.table === 'land_units_tables').row.melee_attack = 100; },
  ];
  for (const mutate of mutations) {
    const supplied = options(); mutate(supplied.evidence);
    assert.throws(() => buildFirstProductionBatch(supplied), /input hash differs/);
    assert.deepEqual(supplied.units, units);
  }
});

test('production result boundary refuses unproven, unresolved, derived, nonfinite and invalid values', async () => {
  const { buildFirstProductionBatch, assertFirstProductionResult } = await gate();
  const normalized = buildFirstProductionBatch(options()).normalized;
  const ids = factions.map(faction => faction.id);
  const cases = [
    result => { result.unit.entities.count = 16; }, // raw count is deliberately not a displayed count
    result => { result.unit.entities.totalHealth = 0; },
    result => { result.unit.movement.speed = null; },
    result => { result.unit.movement.speed = 50; },
    result => { result.unit.defense.armor = Infinity; },
    result => { result.unit.melee.damage.base = -1; },
    result => { result.unit.missile = { projectile: {} }; },
    result => { result.unit.melee.damage.total = 110; },
    result => { result.unit.classification.role = 'UNVERIFIED'; },
    result => { result.provenance.fields.find(field => field.field === 'defense.armor').kind = 'DERIVED_CONFIRMED'; },
    result => { result.provenance.fields.find(field => field.field === 'defense.armor').source.sourcePack = 'RUNTIME_CCO'; },
    result => { result.unmapped.push({ kind: 'ability', caId: 'unknown' }); },
    result => { delete result.unit.entities; },
    result => { result.provenance.identity.caLandUnitKey = 'different_land'; },
  ];
  for (const mutate of cases) {
    const changed = structuredClone(normalized); mutate(changed);
    assert.throws(() => assertFirstProductionResult(changed, validateUnits, ids));
  }
  assert.throws(() => assertFirstProductionResult(normalized, validateUnits, []), /validator/);
  assert.equal(normalized.unit.defense.shieldBlockChance, 0);
  assert.equal(normalized.unit.melee.damage.bonusVsInfantry, 0);
  assert.equal(normalized.unit.movement.canSkirmish, false);
});

test('promotion refuses production/diagnostic collisions, duplicate IDs and differing existing records', async () => {
  const { buildFirstProductionBatch, firstProductionReview: review } = await gate();
  const collision = options(); collision.diagnosticIds.push(review.id);
  assert.throws(() => buildFirstProductionBatch(collision), /diagnostic ID collision/);
  const duplicate = options(); duplicate.units.push(duplicate.units[0]);
  assert.throws(() => buildFirstProductionBatch(duplicate), /duplicate existing identity/);
  const changed = options(); changed.units.find(unit => unit.id === review.id).defense.armor = 61;
  assert.throws(() => buildFirstProductionBatch(changed), /will not overwrite/);
  const faction = options(); faction.factions.find(item => item.id === review.factionId).name = 'guessed faction';
  assert.throws(() => buildFirstProductionBatch(faction), /will not overwrite/);
});

test('production identity, representative direct values and unknown omissions match the reviewed source', async () => {
  const { buildFirstProductionBatch, firstProductionReview: review } = await gate();
  const { normalized, unit } = buildFirstProductionBatch(options());
  assert.equal(game.getUnit(review.id).name, 'Dragon Ogres');
  assert.equal(resolveSavedTargetName({ entityType: 'unit', entityId: review.id }), review.name);
  const rawLand = input.dump.rows.find(row => row.table === 'land_units_tables').row;
  const rawWeapon = input.dump.rows.find(row => row.table === 'melee_weapons_tables').row;
  const rawMain = input.dump.rows.find(row => row.table === 'main_units_tables').row;
  assert.equal(unit.melee.meleeAttack, rawLand.melee_attack);
  assert.equal(unit.defense.meleeDefense, rawLand.melee_defence);
  assert.equal(unit.melee.damage.armorPiercing, rawWeapon.ap_damage);
  assert.equal(unit.campaign.recruitmentCost, rawMain.recruitment_cost);
  assert.equal(unit.melee.damage.base, rawWeapon.damage);
  assert.equal(getMeleeWeaponDamage(unit), 110);
  assert.equal(rawMain.num_men, 16);
  for (const object of [unit.entities, unit.movement, unit.defense, unit.campaign]) assert(!Object.values(object).includes(null));
  for (const field of ['count', 'totalHealth', 'healthPerEntity', 'unitScale']) assert(!Object.hasOwn(unit.entities, field));
  for (const field of ['speed', 'groundSpeed', 'chargeSpeed', 'canFly', 'canRun']) assert(!Object.hasOwn(unit.movement, field));
  assert(!unit.missile && !unit.defense.resistances && !unit.campaign.recruitmentRequirements && !unit.campaign.unitCap);
  assert(!unit.classification.role && !unit.melee.damage.total);
  for (const provenance of normalized.provenance.fields) {
    const rows = [...input.dump.rows, ...input.permissionTrace.rows];
    const raw = rows.find(row => row.id === provenance.source.rowId);
    assert.deepEqual(provenance.source.rowKey, raw.key);
    assert.deepEqual(provenance.rawValue, raw.row[provenance.source.field]);
  }
  const local = input.reviewedSource.reference;
  if (existsSync(local)) {
    const bytes = readFileSync(local), pilot = JSON.parse(bytes);
    assert.equal(sha(bytes), input.reviewedSource.sha256);
    assert.deepEqual(normalized.unit, pilot.normalized.unit);
    assert.deepEqual(normalized.omitted, pilot.normalized.omitted);
  }
});

test('first batch preserves sample records, diagnostic bytes and primary roster boundaries', async () => {
  const { firstProductionReview: review } = await gate();
  assert.equal(sha(JSON.stringify(units.filter(unit => unit.gameVersion === 'sample'))), '892b95c759ff9a69d82fb8c5db2914e00701cc989d59d39c6e34a0cf2d56f856');
  assert.equal(sha(JSON.stringify(factions.filter(faction => faction.gameVersion === 'sample'))), '6c6a2b29bc9655347fa7091d0d706e0be85c8c7d52310ebb21a29bfbc5bba664');
  assert.equal(sha(readFileSync('src/data/unitDiagnostics.json')), '1abbe4b8251320e86dbe7470bf3cf3729b7759c7c71af2af2b5b9f4ce680bb1f');
  assert.equal(game.getFactionUnits('vampire_counts').filter(unit => unit.gameVersion === 'sample').length, 5);
  assert.deepEqual(game.getFactionUnits(review.factionId).map(unit => unit.id), units.filter(unit => unit.factionId===review.factionId).map(unit=>unit.id));
  assert(game.getFactionUnits(review.factionId).some(unit=>unit.id===review.id));
  assert.equal(catalog.list().filter(entry => !entry.isSample && entry.hasProduction && entry.id === review.id).length, 1);
  const entry = catalog.get(review.id);
  assert(entry.hasProduction && !entry.isSample && !entry.hasDiagnostic && entry.kind === 'unit');
  for (const item of diagnostics.list()) assert(game.getUnit(item.id) && item.productionEligible === false);
  assert.deepEqual(validateUnits(units, factions.map(faction => faction.id)), []);
  assert(!/[A-Z]:[\\/]|\/Users\//.test(JSON.stringify(unitSource())));
  function unitSource() { return game.getUnit(review.id); }
});

test('production, sample and diagnostic detail screens keep their distinct boundaries and personal controls', async () => {
  const { firstProductionReview: review } = await gate();
  const list = render('/units');
  for (const label of ['Production', 'Sample · 일반 Unit', 'Diagnostic-only', `${catalog.list().length}개 항목`]) assert(list.includes(label));
  const html = render(`/units/${review.id}`);
  for (const label of ['Dragon Ogres', 'Production', '60', '40', '72', '32', '42', '1550', '근접 피해', '110', '9.0.2.0', '미입력', '출처·버전·생략 범위', '즐겨찾기 추가', '내 기록']) assert(html.includes(label), label);
  assert(!html.includes('Production data unavailable') && !html.includes('Diagnostic-only') && !html.includes('>Sample<'));
  assert(html.includes('현재 전투나 캠페인에서의 최종 수치가 아닙니다'));
  const sample = render('/units/zombies');
  assert(sample.includes('>Sample<') && sample.includes('구조 검증용 샘플') && !sample.includes('근접 피해'));
  const diagnostic = render(`/units/${diagnostics.list()[0].id}`);
  assert(!diagnostic.includes('Production data unavailable') && diagnostic.includes('>Production<') && diagnostic.includes('UNVERIFIED') && diagnostic.includes('INCONCLUSIVE'));
});
