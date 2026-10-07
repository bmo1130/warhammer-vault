const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const App = require('../.test-build/src/App.js').default;
const SavedTargetRow = require('../.test-build/src/components/SavedTargetRow.js').default;
const { gameRepository: production } = require('../.test-build/src/repositories/gameRepository.js');
const { unitDiagnosticRepository: diagnostics } = require('../.test-build/src/repositories/unitDiagnosticRepository.js');
const { createUnitCatalog, filterUnitCatalog, unitCatalogRepository: catalog } = require('../.test-build/src/repositories/unitCatalogRepository.js');
const { searchArchive, resolveSavedTargetName } = require('../.test-build/src/repositories/archivePresentation.js');
const clean = html => html.replace(/<!--.*?-->/g, '');
const render = url => clean(renderToString(React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(App))));
const renderTarget = target => clean(renderToString(React.createElement(MemoryRouter, {}, React.createElement(SavedTargetRow, { target }))));
const totalUnits = require('../src/data/units.json').length;
const target = id => ({ entityType: 'unit', entityId: id });

test('UI catalog projects both sources without stats, admission, or production collection mutations', () => {
  const paths = ['src/data/units.json', 'src/data/unitDiagnostics.json'];
  const before = paths.map(path => readFileSync(path));
  const units = production.listUnits(), evidence = diagnostics.list();
  const originalUnits = structuredClone(units), originalEvidence = structuredClone(evidence);
  assert.equal(units.length, totalUnits);
  assert.equal(catalog.list().length, totalUnits);
  assert.equal(new Set(catalog.list().map(entry => entry.id)).size, totalUnits);
  for (const unit of units) {
    const item = catalog.get(unit.id);
    assert(item.hasProduction && item.hasDiagnostic === Boolean(diagnostics.get(unit.id)) && item.isSample === (unit.gameVersion === 'sample'));
    assert.equal(item.kind, 'unit');
    assert.equal(item.route, `/units/${unit.id}`);
    assert(!('entities' in item) && !('melee' in item));
  }
  for (const entry of evidence) {
    const item = catalog.get(entry.id);
    assert(item.hasProduction && item.hasDiagnostic && !item.isSample);
    assert.equal(item.kind, 'unit');
    assert(production.getUnit(entry.id));
    assert(production.getFactionUnits(entry.factionId).some(unit => unit.id === entry.id));
    assert.equal(production.search(entry.id).length, 1);
    assert.equal(entry.productionEligible, false);
    render(item.route);
  }
  assert.equal(production.getFactionUnits('vampire_counts').filter(unit => unit.gameVersion === 'sample').length, 5);
  assert.deepEqual(units, originalUnits);
  assert.deepEqual(evidence, originalEvidence);
  paths.forEach((path, index) => assert.deepEqual(readFileSync(path), before[index]));
});

test('colliding or duplicate exact IDs fail explicitly; identical names stay separate', () => {
  const unit = production.listUnits()[0], diagnostic = diagnostics.list()[0];
  assert.throws(() => createUnitCatalog([unit], [{ ...diagnostic, id: unit.id }]), /ID collision/);
  assert.throws(() => createUnitCatalog([unit, unit], []), /ID collision/);
  assert.throws(() => createUnitCatalog([], [diagnostic, diagnostic]), /ID collision/);
  const sameName = createUnitCatalog([unit], [{ ...diagnostic, name: unit.name }]);
  assert.equal(sameName.length, 2);
  assert.notEqual(sameName[0].id, sameName[1].id);
  assert.equal(sameName[0].name, sameName[1].name);
  assert(Object.isFrozen(sameName) && sameName.every(Object.isFrozen));
  assert.equal(catalog.get(diagnostic.name), undefined);
  assert.equal(catalog.get(diagnostic.sourceMainKey), undefined);
});

test('catalog filters and trimmed case-insensitive names, IDs and exact source keys intersect', () => {
  assert.equal(catalog.search('', 'all').length, totalUnits);
  assert.equal(catalog.search('', 'unit').length, totalUnits);
  assert.equal(catalog.search('', 'evidence').length, 5);
  assert.equal(catalog.search('', 'diagnostic-only').length, 0);
  for (const entry of diagnostics.list()) {
    for (const query of [entry.name, `  ${entry.id.toUpperCase()}  `, entry.sourceMainKey, entry.sourceLandKey]) {
      assert(catalog.search(query).some(item => item.id === entry.id));
      assert(catalog.search(query, 'unit').some(item => item.id === entry.id));
    }
  }
  assert.equal(catalog.search('좀비', 'unit')[0].id, 'zombies');
  assert.equal(catalog.search('NECROFEX', 'evidence').length, 1);
  assert.deepEqual(catalog.search('no-such-unit'), []);
  assert.deepEqual(filterUnitCatalog([], '', 'all'), []);
});

test('/units renders labels, availability, accessible filters, counts and exact detail links', () => {
  const html = render('/units');
  for (const text of ['유닛 탐색', `${totalUnits}개 항목`, 'Sample · 일반 Unit', 'Diagnostic-only', 'Production · Evidence', 'Diagnostic evidence 있음', 'Diagnostic evidence 없음', '구조 검증용 샘플 · 수치 미검증']) assert(html.includes(text), text);
  assert.match(html, /aria-label="유닛 이름, ID, source key 검색"/);
  assert.match(html, /role="group" aria-label="유닛 유형 필터"/);
  assert.match(html, /aria-pressed="true"[^>]*>전체/);
  for (const entry of catalog.list()) assert(html.includes(`href="${entry.route}"`));
  for (const [filter, count] of [['unit', totalUnits], ['diagnostic-only', 0], ['evidence', 5]]) {
    const filtered = render(`/units?filter=${filter}`);
    assert(filtered.includes(`${count}개 항목`));
    assert.equal(filtered.includes('href="/units/zombies"'), filter === 'unit');
    assert.equal(filtered.includes(`href="${catalog.list().find(entry => entry.hasDiagnostic).route}"`), filter !== 'diagnostic-only');
  }
  const searched = render('/units?filter=evidence&q=Dread');
  assert(searched.includes('1개 항목') && searched.includes(production.getUnit(diagnostics.list().find(e=>e.name==='Dread Saurian').id).name));
  assert(!searched.includes('Black Coach'));
  assert(render('/units?filter=unknown').includes(`${totalUnits}개 항목`));
});

test('no search matches and no catalog data have different empty states', () => {
  const noMatches = render('/units?q=zz-no-matches&filter=unit');
  assert(noMatches.includes('검색 결과가 없습니다') && noMatches.includes('검색·필터 초기화'));
  assert(noMatches.includes('0개 항목'));
  const originalList = catalog.list, originalSearch = catalog.search;
  try {
    catalog.list = () => [];
    catalog.search = () => [];
    const noData = render('/units');
    assert(noData.includes('아직 유닛 자료가 없습니다'));
    assert(!noData.includes('검색 결과가 없습니다'));
  } finally { catalog.list = originalList; catalog.search = originalSearch; }
});

test('Home search retains faction, lord and sample unit results and adds every diagnostic identity', () => {
  for (const query of ['뱀파이어', '케믈러', 'zombies', '보병']) {
    const expected = production.search(query);
    for (const item of expected) assert(searchArchive(query).some(result => result.type === item.type && result.id === item.id));
  }
  for (const entry of diagnostics.list()) {
    for (const query of [entry.name, entry.id, entry.sourceMainKey, entry.sourceLandKey]) {
      const found = searchArchive(query).filter(result => result.id === entry.id);
      assert.equal(found.length, 1);
      assert.equal(found[0].type, 'unit');
    }
  }
  assert.deepEqual(searchArchive('  '), []);
  assert.deepEqual(searchArchive('zz-no-match'), []);
  const home = render('/');
  assert(home.includes('href="/units"') && home.includes('href="/units?filter=evidence"'));
  assert(!home.includes('href="/units/ca_unit_'));
});

test('shared details provide production stats, evidence and personal controls', () => {
  for (const entry of diagnostics.list()) {
    const html = render(`/units/${entry.id}`);
    for (const text of ['Production', 'Evidence', '데이터 해석 근거', '즐겨찾기 추가', 'aria-pressed="false"', '내 기록', '정적 entity path', 'Missile 후보 path', 'Runtime case', 'UNVERIFIED', 'INCONCLUSIVE', '상태 안내']) assert(html.includes(text), text);
    assert(html.includes('stats-card') && html.includes('모집비 / 유지비'));
    assert(!html.includes('Production data unavailable') && !html.includes('Diagnostic-only entry'));
    assert.equal(html.includes(`href="/factions/${entry.factionId}"`), Boolean(production.getFaction(entry.factionId)));
    assert(!html.includes('confidence score'));
  }
  const ordinary = render('/units/zombies');
  for (const text of ['기본 스탯', '기본 정보', '미입력', '구조 검증용 샘플', '내 기록']) assert(ordinary.includes(text));
  assert(!ordinary.includes('관찰 자료 범위'));
});

test('saved target rows resolve production and diagnostics by ID, and preserve stale targets without broken links', () => {
  for (const entry of catalog.list()) {
    assert.equal(resolveSavedTargetName(target(entry.id)), entry.name);
    const html = renderTarget(target(entry.id));
    assert(html.includes(entry.name.replaceAll('&','&amp;').replaceAll("'",'&#x27;').replaceAll('"','&quot;')) && html.includes(`href="${entry.route}"`));
    if (entry.kind === 'diagnostic-only') assert(html.includes('Diagnostic-only'));
  }
  assert.equal(resolveSavedTargetName({ entityType: 'faction', entityId: 'vampire_counts' }), '뱀파이어 백작');
  assert(resolveSavedTargetName({ entityType: 'lord', entityId: 'heinrich_kemmler' }));
  for (const stale of [target('past_unit_id'), { entityType: 'hero', entityId: 'old_hero' }, target('<script>stale</script>')]) {
    assert.equal(resolveSavedTargetName(stale), undefined);
    const html = renderTarget(stale);
    assert(html.includes('현재 목록에 없는 항목') && html.includes('백업에 포함'));
    assert(!html.includes('href=') && !html.includes('<script>'));
  }
});

test('desktop and mobile navigation keep the unit link active for list and detail routes', () => {
  for (const url of ['/units', catalog.list().find(entry => entry.hasDiagnostic).route]) {
    const html = render(url);
    assert.match(html, /class="side-link active" href="\/units"/);
    assert.match(html, /class="bottom-link active" href="\/units"/);
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 2);
  }
});
