const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const App = require('../.test-build/src/App.js').default;
const { calculateManualModifiers: calculate, parseManualModifierProfile: parse } = require('../.test-build/src/domain/manualModifierProfile.js');
const { comparisonUnit, comparisonOptions } = require('../.test-build/src/repositories/productionUnitSelection.js');
const { getMeleeWeaponDamage } = require('../.test-build/src/domain/unitCalculations.js');
const { modifierStatPaths } = require('../.test-build/src/domain/unitModifiers.js');
const { modifierStatLabels } = require('../.test-build/src/domain/modifierStatLabels.js');
const { wikiRepository: wiki, parseBackup } = require('../.test-build/src/repositories/wikiRepository.js');
const { memoryIndexedDb } = require('./fixtures/memoryIndexedDb.cjs');
const grail = comparisonUnit('ca_unit_wh_main_brt_cav_grail_knights');
const row = (id, stat, operation, value) => ({ id, stat, operation, value: String(value) });
const rows = [row('attack', 'melee.meleeAttack', 'add', 8), row('charge', 'melee.chargeBonus', 'multiply', 15), row('speed', 'movement.speed', 'multiply', 5)];
const render = url => renderToString(React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(App)));
const close = (value, expected) => assert(Math.abs(value - expected) < 1e-10);

test('calculator input bridge reuses exact production selection and handles add/percent/set/stacking without mutation', () => {
  assert.equal(comparisonOptions().length, 101);
  assert(comparisonOptions().every(entry => !entry.isSample));
  assert.equal(comparisonUnit('zombies'), undefined);
  const before = JSON.stringify(grail);
  const result = calculate(grail, rows);
  assert.equal(result.error, ''); assert.equal(result.unit.melee.meleeAttack, 46);
  close(result.unit.melee.chargeBonus, 86.25); close(result.unit.movement.speed, 88.2);
  const stack = [row('set', 'melee.meleeAttack', 'set', 30), row('a', 'melee.meleeAttack', 'add', 5), row('b', 'melee.meleeAttack', 'add', 3), row('p', 'melee.meleeAttack', 'multiply', 10)];
  close(calculate(grail, stack).unit.melee.meleeAttack, 41.8);
  const reverse = calculate(grail, stack.slice().reverse());
  assert.deepEqual(calculate(grail, stack).unit, reverse.unit);
  assert.deepEqual(calculate(grail, stack).breakdown, reverse.breakdown);
  assert.equal(JSON.stringify(grail), before);
});

test('UI bridge preserves unknown, calculates zero, rejects bad input/conflict and recomputes total damage', () => {
  const hp = calculate(grail, [row('hp', 'entities.totalHealth', 'multiply', 15)]);
  assert.equal(hp.unit.entities.totalHealth, undefined); assert.equal(hp.breakdown[0].status, 'unknown');
  assert.equal(calculate(grail, [row('zero', 'melee.damage.bonusVsInfantry', 'add', 10)]).unit.melee.damage.bonusVsInfantry, 10);
  for (const value of ['', ' ', 'abc', 'NaN', 'Infinity', '-Infinity', '0x20']) {
    const bad = calculate(grail, [row('bad', 'movement.speed', 'add', value)]);
    assert(bad.error); assert.equal(bad.unit, undefined); assert.deepEqual(bad.modifiers, []);
  }
  const conflict = calculate(grail, [row('a', 'melee.meleeAttack', 'set', 10), row('b', 'melee.meleeAttack', 'set', 20)]);
  assert.match(conflict.error, /서로 다른 SET/); assert.equal(conflict.unit, undefined);
  assert(calculate(grail, [row('a', 'movement.canFly', 'add', 1)]).error);
  const damage = calculate(grail, [row('base', 'melee.damage.base', 'multiply', 10), row('ap', 'melee.damage.armorPiercing', 'multiply', 10)]);
  close(getMeleeWeaponDamage(damage.unit), 50.6);
  assert.equal(Object.hasOwn(damage.unit.melee.damage, 'total'), false);
});

test('route renders selector/profile controls/base-result table and invalid Unit IDs safely', () => {
  const html = render(`/calculator?unit=${grail.id}`);
  for (const label of ['계산할 유닛', 'Profile 이름', '저장된 Profile 불러오기', '새 Profile', 'Profile 삭제', 'Modifier 추가', 'Base', 'Result', '총 무기 피해']) assert(html.includes(label), label);
  assert(!modifierStatPaths.includes('melee.damage.total'));
  assert(modifierStatPaths.every(stat => modifierStatLabels[stat]));
  assert(html.includes('comparison-scroll'));
  assert(render('/calculator?unit=missing').includes('비교 가능한 Production 유닛이 아닙니다'));
  assert(!render('/calculator?unit=zombies').includes('calculator-table'));
  assert(render('/').includes('href="/calculator"'));
});

test('Manual Profile CRUD preserves exact unit/modifiers and independent creation timestamp', async () => {
  global.indexedDB = memoryIndexedDb();
  const modifiers = calculate(grail, rows).modifiers;
  const first = await wiki.saveManualProfile({ name: '수동 테스트', unitId: grail.id, modifiers });
  assert.equal(first.unitId, grail.id); assert.deepEqual(first.modifiers, modifiers);
  assert.deepEqual(await wiki.getManualProfile(first.id), first);
  assert.equal((await wiki.listManualProfiles()).profiles.length, 1);
  const updated = await wiki.saveManualProfile({ id: first.id, name: '수정', unitId: grail.id, modifiers: modifiers.slice(0, 1) });
  assert.equal(updated.createdAt, first.createdAt); assert.equal(updated.id, first.id);
  assert.equal((await wiki.getManualProfile(first.id)).name, '수정');
  await assert.rejects(wiki.saveManualProfile({ id: first.id, name: 'wrong unit', unitId: comparisonOptions()[0].id, modifiers }), /연결 유닛/);
  await wiki.deleteManualProfile(first.id);
  assert.equal(await wiki.getManualProfile(first.id), undefined);
  assert.equal((await wiki.listManualProfiles()).profiles.length, 0);
  await assert.rejects(wiki.saveManualProfile({ id: 'missing', name: 'none', unitId: grail.id, modifiers }), /찾을 수 없습니다/);
});

test('v1 legacy backup restores without profiles; new profile roundtrip preserves existing personal records', async () => {
  global.indexedDB = memoryIndexedDb();
  const target = { entityType: 'unit', entityId: grail.id };
  await wiki.saveArticle(target, { evaluation: '보존', tactics: '', strengths: '', weaknesses: '' });
  await wiki.setBookmark(target, true); await wiki.recordView(target);
  await wiki.saveNote({ id: 'note', title: '보존', body: '', createdAt: 'now', updatedAt: 'now' });
  await wiki.saveManualProfile({ name: 'roundtrip', unitId: grail.id, modifiers: calculate(grail, rows).modifiers });
  const backup = await wiki.exportBackup();
  assert.equal(backup.version, 1); assert.equal(backup.manualModifierProfiles.length, 1);
  global.indexedDB = memoryIndexedDb();
  await wiki.importBackup(JSON.parse(JSON.stringify(backup)));
  const restored = await wiki.exportBackup();
  for (const key of ['articles', 'notes', 'bookmarks', 'recentViews', 'manualModifierProfiles']) assert.deepEqual(restored[key], backup[key]);
  const legacy = { ...backup }; delete legacy.manualModifierProfiles;
  assert.deepEqual(parseBackup(legacy).manualModifierProfiles, []);
  await wiki.importBackup(legacy);
  assert.deepEqual((await wiki.exportBackup()).manualModifierProfiles, []);
  assert.equal((await wiki.getArticle(target)).evaluation, '보존');
});

test('corrupt profiles are rejected before restore mutates stores and safely omitted from profile list', async () => {
  global.indexedDB = memoryIndexedDb();
  const profile = await wiki.saveManualProfile({ name: 'good', unitId: grail.id, modifiers: calculate(grail, rows).modifiers });
  for (const mutate of [p => p.unitId = 'missing', p => p.modifiers[0].stat = '__proto__.bad', p => p.modifiers[0].value = '8', p => p.modifiers[0].operation = 'unknown', p => p.name = '', p => p.createdAt = 'invalid']) {
    const broken = structuredClone(profile); mutate(broken);
    assert.throws(() => parse(broken, comparisonUnit));
    const backup = await wiki.exportBackup(); backup.manualModifierProfiles = [broken];
    await assert.rejects(wiki.importBackup(backup));
    assert.deepEqual(await wiki.getManualProfile(profile.id), profile);
  }
  const duplicate = await wiki.exportBackup(); duplicate.manualModifierProfiles.push(profile);
  await assert.rejects(wiki.importBackup(duplicate), /중복/);
  await new Promise((resolve, reject) => {
    const request = indexedDB.open('warhammer-vault', 2);
    request.onsuccess = () => {
      const tx = request.result.transaction('manualModifierProfiles', 'readwrite');
      tx.objectStore('manualModifierProfiles').put({ id: 'broken' });
      tx.oncomplete = resolve; tx.onerror = reject;
    };
  });
  assert.equal((await wiki.listManualProfiles()).invalidCount, 1);
  await assert.rejects(wiki.getManualProfile('broken'), /손상/);
  await assert.rejects(wiki.exportBackup(), /손상/);
});

test('IndexedDB v1 -> v2 upgrade adds only profile store and keeps pre-existing personal records', async () => {
  global.indexedDB = memoryIndexedDb();
  await new Promise(resolve => {
    const request = indexedDB.open('warhammer-vault', 1);
    request.onupgradeneeded = () => { for (const store of ['articles', 'notes', 'bookmarks', 'recentViews']) request.result.createObjectStore(store, { keyPath: 'id' }); };
    request.onsuccess = () => {
      const tx = request.result.transaction('notes', 'readwrite');
      tx.objectStore('notes').put({ id: 'legacy', title: '보존', body: '', createdAt: 'old', updatedAt: 'old' });
      tx.oncomplete = resolve;
    };
  });
  assert.equal((await wiki.listNotes())[0].id, 'legacy');
  await wiki.saveManualProfile({ name: 'new', unitId: grail.id, modifiers: [] });
  assert.equal((await wiki.listNotes())[0].id, 'legacy');
  assert.equal((await wiki.listManualProfiles()).profiles.length, 1);
});
