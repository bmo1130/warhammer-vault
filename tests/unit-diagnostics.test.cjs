const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { createHash } = require('node:crypto');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const App = require('../.test-build/src/App.js').default;
const Section = require('../.test-build/src/components/UnitDiagnosticSection.js').default;
const { unitDiagnosticRepository: diagnostics } = require('../.test-build/src/repositories/unitDiagnosticRepository.js');
const { gameRepository: production } = require('../.test-build/src/repositories/gameRepository.js');
const clean = html => html.replace(/<!--.*?-->/g, '');
const render = id => clean(renderToString(React.createElement(MemoryRouter, { initialEntries: [`/units/${id}`] }, React.createElement(App))));
const section = evidence => clean(renderToString(React.createElement(Section, { evidence })));
const find = name => diagnostics.list().find(entry => entry.name === name);

test('diagnostic IDs have exact lookups alongside independently admitted production records', () => {
  assert.equal(diagnostics.list().length, 5);
  for (const entry of diagnostics.list()) {
    assert.equal(diagnostics.get(entry.id), entry);
    assert.equal(diagnostics.get(entry.name), undefined);
    assert.equal(diagnostics.get(entry.sourceMainKey), undefined);
    assert(production.getUnit(entry.id));
    assert(production.search(entry.name).some(result => result.id === entry.id));
    assert(production.getFactionUnits(entry.factionId).some(unit => unit.id === entry.id));
    assert.equal(entry.productionEligible, false);
  }
  assert.equal(diagnostics.get('zombies'), undefined);
});

test('ordinary unit pages remain intact with no empty diagnostic area', () => {
  const before = readFileSync('src/data/units.json', 'utf8');
  for (const unit of JSON.parse(before)) {
    const html = render(unit.id);
    for (const text of [unit.name, '기본 스탯', '기본 정보', '내 기록']) assert(html.includes(text));
    assert.equal(html.includes('데이터 해석 근거'), Boolean(diagnostics.get(unit.id)));
    assert(!html.includes('Production data unavailable'));
  }
  assert.equal(section(undefined), '');
  assert.equal(readFileSync('src/data/units.json', 'utf8'), before);
});

test('five shared entries reuse unit routes with independently reviewed production stats', () => {
  for (const entry of diagnostics.list()) {
    const before = JSON.stringify(entry);
    const html = render(entry.id);
    for (const text of [entry.name, 'Production', 'Evidence', '데이터 해석 근거']) assert(html.includes(text), text);
    assert(html.includes('<h2>기본 스탯'));
    assert(!html.includes('Production data unavailable'));
    assert(html.includes('stats-card'));
    assert(html.includes('모집비 / 유지비'));
    assert.match(html, /<details class="panel diagnostic-section">/);
    assert(!html.includes('<details class="panel diagnostic-section" open'));
    assert(!html.includes('<pre'));
    assert(!html.includes('[&quot;wh_'));
    assert.equal(JSON.stringify(entry), before);
  }
  assert(render('missing').includes('항목을 찾을 수 없습니다'));
});

test('complex entity records distinguish raw counts, runtime views, overlap and incomplete captures', () => {
  const coach = render(find('Black Coach').id);
  for (const text of ['Man', 'Mount', 'Engine', 'Articulated', 'RAW_COUNT_ONLY', 'OBSERVED_RUNTIME']) assert(coach.includes(text), text);
  const chariot = render(find('Skeleton Chariots').id);
  for (const text of ['24 entries', '12 entries', '부모 관계는 미검증', 'UNVERIFIED', 'INCONCLUSIVE', 'held']) assert(chariot.includes(text), text);
  const dread = render(find('Dread Saurian').id);
  for (const text of ['정적 연결 10건', '정적 연결 2건', '같은 물리적 본체', 'TRACE_SAMPLE_COVERAGE_INCOMPLETE']) assert(dread.includes(text), text);
  assert(render(find('Free Company Militia').id).includes('NOT_REVIEWED'));
});

test('observed cannon projectile and static-only rifle candidates never resolve weapon activation', () => {
  const entry = find('Necrofex Colossus');
  assert.equal(entry.missiles.length, 6);
  const html = render(entry.id);
  for (const text of ['wh2_cst_necrofex_colossus_cannon_ball', '정적 연결 5건', 'static only', '관찰된 ActiveProjectileContext', 'Weapon source activation 미확정', 'INCONCLUSIVE']) assert(html.includes(text), text);
  assert(!html.includes('>VERIFIED ·'));
  for (const missile of entry.missiles) assert(missile.activationStatuses.every(status => status === 'INCONCLUSIVE'));
});

test('four Free Company setup observations and existing scoped precedence stay separate from static candidates', () => {
  const entry = find('Free Company Militia'), html = render(entry.id);
  assert.equal(entry.missiles.length, 3);
  assert.equal(entry.cases.length, 4);
  assert.deepEqual(entry.cases.map(c => c.projectileKeys[0]), [
    'wh_dlc04_emp_free_company_pistol_bullet', 'wh2_dlc17_emp_free_company_pistol_bullet_blessed',
    'wh_dlc04_emp_free_company_pistol_bullet_exploding', 'wh_dlc04_emp_free_company_pistol_bullet_exploding',
  ]);
  for (const text of ['기본 상태', 'Blessed Bullets만 적용', 'Exploding Bullets만 적용', '두 modifier 모두 적용', '조건부 / override 후보', 'Exploding Bullets &gt; Blessed Bullets', 'RUNTIME_MANUAL', 'OBSERVED_ONCE', 'EXACT_SOURCE_GAME_DECLARED_CAMPAIGN_SETUP_ONLY']) assert(html.includes(text), text);
  assert.equal(entry.precedence.relationship, 'PRECEDES');
  assert.equal(entry.precedence.productionEligible, false);
});

test('provenance exposes snapshot and meaningful references without paths or raw debug objects', () => {
  const html = render(find('Dread Saurian').id);
  for (const text of ['출처·버전·관찰 범위', '9.0.2.0', 'RUNTIME_CCO', 'RUNTIME_MANUAL', 'db.pack', 'local_en.pack', diagnostics.snapshot.staticSnapshotId, diagnostics.snapshot.snapshot.schemaSha256, '첫 frame 참조', '관찰 지점', 'NOT_RECORDED']) assert(html.includes(text), text);
  assert(!/[A-Za-z]:\\/.test(html));
  assert(!html.includes('sourcePackPath'));
});

test('existing conflict, partial and inconclusive statuses are retained without choosing a winner', () => {
  const evidence = structuredClone(find('Necrofex Colossus'));
  evidence.entities[0].statuses = ['OBSERVED_RUNTIME', 'CONFLICTING_RUNTIME_EVIDENCE'];
  evidence.missiles[0].activationStatuses = ['INCONCLUSIVE', 'CONFLICTING_RUNTIME_EVIDENCE'];
  evidence.cases[0].completeCaptures = 0;
  evidence.cases[0].problems = ['TRACE_SAMPLE_COVERAGE_INCOMPLETE'];
  const html = section(evidence);
  for (const text of ['CONFLICTING_RUNTIME_EVIDENCE', '상충하는 관찰', '0 complete', 'UNVERIFIED', 'INCONCLUSIVE']) assert(html.includes(text));
});

test('display projection agrees with the actual saved batch and retains every candidate path', {
  skip: !diagnostics.snapshot.inputs.every(input => existsSync(input.file)) && 'local reviewed artifacts unavailable',
}, () => {
  for (const input of diagnostics.snapshot.inputs) {
    assert.equal(createHash('sha256').update(readFileSync(input.file)).digest('hex'), input.sha256, input.file);
  }
  const batch = JSON.parse(readFileSync(diagnostics.snapshot.inputs[0].file));
  const candidates = JSON.parse(readFileSync(diagnostics.snapshot.inputs[3].file));
  const index = JSON.parse(readFileSync(diagnostics.snapshot.inputs[4].file));
  for (const entry of diagnostics.list()) {
    const subject = index.subjects.find(s => s.catalogEntryId === entry.id && s.contextId === entry.contextId);
    assert(subject);
    assert.equal(entry.sourceMainKey, subject.sourceMainKey);
    assert.equal(entry.sourceLandKey, subject.sourceLandKey);
    const source = candidates.units.find(u => u.sourceMainKey === entry.sourceMainKey);
    assert.deepEqual(entry.entities.map(p => p.pathId), (source?.views.AllEntitySources ?? subject.entity?.paths ?? []).map(p => p.pathId));
    assert.deepEqual(entry.missiles.map(p => p.pathId), (source?.views.AllMissileSources ?? subject.missile.paths).map(p => p.pathId));
    for (const c of entry.cases) {
      const actual = batch.cases.find(original => original.id === c.id);
      assert.deepEqual(c.fields, actual.firstUnitFields);
      assert.deepEqual(c.projectileKeys, actual.projectileKeys);
      assert.equal(c.entityIndexContinuity, actual.entityIndexContinuity);
      assert.equal(c.simultaneousSources, actual.simultaneousSources);
    }
  }
  assert.equal(find('Free Company Militia').precedence.status, batch.precedence.status);
});
