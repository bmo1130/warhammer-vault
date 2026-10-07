const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const App = require('../.test-build/src/App.js').default;
const { compareUnits, formatComparisonValue } = require('../.test-build/src/domain/unitComparison.js');
const { comparisonOptions, comparisonUnit } = require('../.test-build/src/pages/ComparePage.js');
const { gameRepository } = require('../.test-build/src/repositories/gameRepository.js');
const { unitCatalogRepository } = require('../.test-build/src/repositories/unitCatalogRepository.js');
const { pathFor } = require('../.test-build/src/domain/entities.js');
const swordsmen = comparisonUnit('ca_unit_wh_main_emp_inf_swordsmen');
const grail = comparisonUnit('ca_unit_wh_main_brt_cav_grail_knights');
const ogres = comparisonUnit('ca_unit_wh_dlc01_chs_mon_dragon_ogre');
const render = (url) => renderToString(React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(App)));

test('Production selection excludes Sample and includes Production with evidence; searches names and exact IDs', () => {
  assert.equal(comparisonOptions().length, require('../src/data/units.json').filter(u => u.gameVersion !== 'sample').length);
  for (const entry of comparisonOptions()) assert(entry.hasProduction && !entry.isSample);
  for (const unit of gameRepository.listUnits().filter(u => u.gameVersion === 'sample')) assert.equal(comparisonUnit(unit.id), undefined);
  for (const entry of unitCatalogRepository.list().filter(e => e.hasDiagnostic && e.hasProduction && !e.isSample)) assert(comparisonUnit(entry.id));
  assert.equal(comparisonOptions(grail.id)[0].id, grail.id);
  assert(comparisonOptions('grail knights').some(e => e.id === grail.id));
  assert.equal(comparisonUnit('missing'), undefined);
});

test('base comparison reads admitted values only and uses the approved damage helper contract', () => {
  const rows = compareUnits(grail, ogres);
  const row = label => rows.find(r => r.label === label);
  assert.deepEqual(row('속도'), { label: '속도', left: 84, right: 64, delta: 20 });
  assert.equal(row('총 생명력 (ULTRA)').left, undefined);
  assert.equal(row('총 생명력 (ULTRA)').right, 9856);
  assert.equal(row('총 생명력 (ULTRA)').delta, undefined);
});

test('unknown and actual zero remain distinct; partial damage and unknown numbers have no delta', () => {
  const a = { ...swordsmen, entities: {}, defense: { armor: 0 }, melee: { damage: { base: 0, armorPiercing: 10, bonusVsLarge: 100 } } };
  const b = { ...a, defense: {}, melee: { damage: { base: 10 } } };
  const rows = compareUnits(a, b);
  assert.equal(formatComparisonValue(0), '0');
  assert.equal(formatComparisonValue(undefined), '—');
  const armor = rows.find(r => r.label === '장갑');
  assert.equal(armor.left, 0); assert.equal(armor.right, undefined); assert.equal(armor.delta, undefined);
  const total = rows.find(r => r.label === '총 무기 피해');
  assert.equal(total.left, 10); assert.equal(total.right, undefined); assert.equal(total.delta, undefined);
  assert.equal(rows.find(r => r.label === '개체 수').left, undefined);
  for (const row of compareUnits(a, a)) if (typeof row.left === 'number') assert.equal(row.delta, 0);
});

test('compare route renders exact details links, stat labels and same-unit/invalid URL states safely', () => {
  const html = render(`/compare?left=${grail.id}&right=${ogres.id}`);
  for (const label of [grail.name, ogres.name, '장갑', '속도', '총 무기 피해', '무기 길이', '총 생명력', '개체 수', '모집 턴', '방벽', '와드 저항']) assert(html.includes(label), label);
  assert(html.includes(`href="${pathFor('unit', grail.id)}"`));
  assert(html.includes(`href="${pathFor('unit', ogres.id)}"`));
  assert(render(`/compare?left=${grail.id}&right=${grail.id}`).includes('기본 스탯 비교'));
  assert(render('/compare?left=missing&right=zombies').includes('비교 가능한 Production 유닛이 아닙니다'));
  assert(!render('/compare?left=missing').includes('comparison-table'));
  assert(render('/').includes('href="/compare"'));
  assert(html.includes('comparison-scroll'));
  assert(html.includes('scope="row"'));
});
