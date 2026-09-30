const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const App = require('../.test-build/src/App.js').default;
const { gameRepository } = require('../.test-build/src/repositories/gameRepository.js');
const { entityRoutes, pathFor } = require('../.test-build/src/domain/entities.js');

const render = (url) => renderToString(React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(App)));

test('explicit entity routes preserve existing links and handle hero/research correctly', () => {
  const expected = { faction: 'factions', lord: 'lords', hero: 'heroes', unit: 'units', research: 'research', building: 'buildings', landmark: 'landmarks' };
  assert.deepEqual(entityRoutes, expected);
  for (const [type, route] of Object.entries(expected)) assert.equal(pathFor(type, 'test'), `/${route}/test`);
  assert.equal(pathFor('unit', 'a/b'), '/units/a%2Fb');
});

test('searches, ID lookups and faction indexes use migrated unit classification', () => {
  for (const unit of gameRepository.getFactionUnits('vampire_counts')) {
    assert.equal(gameRepository.getUnit(unit.id), unit);
    assert.equal(gameRepository.getEntityName('unit', unit.id), unit.name);
    for (const query of [unit.name, unit.id.toUpperCase()]) assert(gameRepository.search(query).some((item) => item.id === unit.id));
    assert(gameRepository.search(unit.classification.category).some((item) => item.id === unit.id && item.detail === unit.classification.category));
  }
  assert(gameRepository.search('뱀파이어').some((item) => item.type === 'faction'));
  assert(gameRepository.search('케믈러').some((item) => item.type === 'lord'));
  assert.deepEqual(gameRepository.search('  '), []);
  assert.equal(gameRepository.getUnit('missing'), undefined);
  assert.equal(gameRepository.getFactionUnits('vampire_counts').length, 5);
  assert.deepEqual(gameRepository.getFactionUnits('missing'), []);
});

test('main routes render existing content including unfilled unit values', () => {
  for (const [url, text] of [['/', '전쟁 서고'], ['/factions', '팩션 목록'], ['/factions/vampire_counts', '모두 보기'], ['/lords/heinrich_kemmler', '하인리히 케믈러'], ['/notes', '자유 메모'], ['/settings', '백업 및 복원'], ['/units/missing', '항목을 찾을 수 없습니다']]) assert(render(url).includes(text), url);
  const html = render('/units/zombies');
  for (const label of ['좀비', '보병', '근접 공격', '근접 방어', '속도', '장갑', '리더십', '생명력', '돌격 보너스', '소속 팩션', '티어', '모집비 / 유지비', '미입력', '내 기록', '즐겨찾기']) assert(html.includes(label), label);
});

test('UnitPage reads grouped stats and displays confirmed zero costs as zero', () => {
  const original = gameRepository.getUnit;
  const unit = { ...original('zombies'), classification: { category: '검증 분류', tier: 4 }, entities: { totalHealth: 7296 }, movement: { speed: 84 }, defense: { armor: 120, leadership: 80, meleeDefense: 34 }, melee: { meleeAttack: 38, chargeBonus: 78, damage: {} }, campaign: { recruitmentCost: 0, upkeep: 0 } };
  gameRepository.getUnit = (id) => id === unit.id ? unit : original(id);
  try {
    const html = render('/units/zombies');
    for (const value of ['검증 분류', 'T4', '7296', '84', '120', '80', '34', '38', '78']) assert(html.includes(value), value);
    assert.match(html, /<strong>0<!-- --> \/ <!-- -->0<\/strong>/);
  } finally { gameRepository.getUnit = original; }
});
