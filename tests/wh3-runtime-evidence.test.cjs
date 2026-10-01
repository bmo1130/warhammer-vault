const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const modules = Promise.all(['contract', 'validate', 'triage', 'static-index', 'jobs'].map(m => import(`../tools/wh3-importer/runtime-evidence/${m}.mjs`)));
async function fixture() {
  const [c, v, t, s, j] = await modules;
  const subject = { sourceMainKey: 'exact_main', sourceLandKey: 'land_shared', contextId: 'roster', catalogEntryId: 'ca_catalog:exact_main:roster', displayName: 'Same Name', factionId: 'empire', gameVersion: 'test-v1', staticSnapshotId: 'snapshot',
    entity: { paths: [{ pathId: 'entity_path', role: 'MAN', entityKey: 'shared_entity' }], runtime: { unitSizeScaling: 'UNRESOLVED' }, completeness: 'COMPLETE_SINGLE_ENTITY', structure: 'COMPLETE_IN_BOUNDED_SCOPE' },
    missile: { paths: [{ pathId: 'weapon_path', role: 'LAND_PRIMARY', activation: { placement: 'STATIC_PRIMARY' } }], completeness: 'COMPLETE_STATIC_SINGLE' }, knownConditionKeys: ['effect_exact'], staticArtifacts: [{ file: 'fixture', sha256: 'fixture' }] };
  const index = { snapshot: { gameVersion: 'test-v1' }, snapshotId: 'snapshot', subjects: [subject] };
  const o = c.observationTemplate(subject, { id: 'job', unitSize: 'MEDIUM' }, 'CARD_MODEL_COUNT');
  o.observation = { result: 'CONCLUSIVE', value: 12, unit: 'models' }; o.confidence = 'OBSERVED_ONCE';
  const doc = (...observations) => ({ format: c.FORMAT, observations });
  const validate = (...observations) => v.validateRuntimeEvidence(doc(...observations), index);
  function verified(x = structuredClone(o)) {
    x.identityVerification = { level: 'EXACT_SOURCE_OBSERVED', reference: 'synthetic-test-reference' }; x.trialId = 'trial-a';
    x.provenance = { kind: 'RUNTIME_MANUAL', observer: 'synthetic-observer', observedAt: '2026-01-01T00:00:00Z', references: ['synthetic.png'] };
    x.setup.battleMode = 'CUSTOM_BATTLE'; x.setup.lord = 'synthetic lord'; x.setup.difficulty = 'normal'; x.setup.rank = 0; x.setup.mods.status = 'NONE';
    x.setup.summoned = 'NO'; x.setup.supplyVariant = 'NO'; x.setup.sessionPhase = 'BATTLE_START';
    for (const k of ['skills', 'rituals', 'effects', 'technologies', 'buildings']) x.setup[k].status = 'KNOWN';
    return x;
  }
  return { c, v, t, s, j, subject, index, o, doc, validate, verified };
}
for (const [label, mutate] of [
  ['missing exact main', o => { delete o.sourceMainKey; }], ['missing exact context', o => { delete o.contextId; }],
  ['display name only', o => { delete o.sourceMainKey; o.displayName = 'Same Name'; }], ['unknown exact context', o => { o.contextId = 'unreviewed'; }],
  ['land drift', o => { o.sourceLandKey = 'wrong'; }], ['catalog ID drift', o => { o.catalogEntryId = 'wrong'; }],
  ['game version drift', o => { o.gameVersion = 'test-v2'; }], ['snapshot drift', o => { o.staticSnapshotId = 'other'; }],
  ['unknown observation type', o => { o.observationType = 'DERIVED_DPS'; }], ['invalid Unit Size', o => { o.unitSize = 'MAXIMUM'; }],
  ['prototype observation type', o => { o.observationType = 'toString'; o.observation = { result: 'INCONCLUSIVE' }; }], ['non-string observation type', o => { o.observationType = ['CARD_MODEL_COUNT']; }],
  ['unknown missile path', o => { o.missilePathIds = ['other_main_path']; }], ['unknown entity path', o => { o.entityPathIds = ['other_entity_path']; }],
  ['missing setup', o => { delete o.setup; }], ['negative numeric count', o => { o.observation.value = -1; }],
  ['fractional model count', o => { o.observation.value = 1.5; }], ['formula payload', o => { o.observation.formula = 'num_men / 2'; }],
  ['wrong numeric unit', o => { o.observation.unit = 'hp'; }], ['unverified effect key', o => { o.setup.effects = { status: 'KNOWN', activeKeys: ['unknown_effect'], labels: [] }; }],
]) test(`runtime validator rejects ${label}`, async () => { const f = await fixture(); mutate(f.o); assert.equal(f.validate(f.o).status, 'REJECTED'); });
test('malformed records/setup/comparison arrays reject without throwing', async () => {
  const f = await fixture(); assert.equal(f.validate(null, 'bad', []).status, 'REJECTED');
  f.o.setup.effects = { status: 'KNOWN', activeKeys: 'bad', labels: [] }; assert.equal(f.validate(f.o).status, 'REJECTED');
  f.o = f.verified(); f.o.observationType = 'UNIT_SIZE_COMPARISON'; f.o.observation = { result: 'CONCLUSIVE', settings: [null, null] }; assert.equal(f.validate(f.o).status, 'REJECTED');
});
test('context-only and inconclusive observations are preserved without pretending exact runtime identity', async () => {
  const f = await fixture(); assert.equal(f.validate(f.o).records[0].status, 'VALIDATED_IDENTITY_PENDING');
  assert.equal(f.v.proposeResolutions(f.validate(f.o)).proposals.length, 0);
  f.o.observation = { result: 'INCONCLUSIVE', notes: 'Rider not independently visible.' }; f.o.confidence = 'INCONCLUSIVE';
  assert.equal(f.validate(f.o).records[0].status, 'VALIDATED_INCONCLUSIVE');
});
test('same exact setup contradictory repetitions conflict without majority/latest winner', async () => {
  const f = await fixture(), a = f.verified(), b = structuredClone(a), c = structuredClone(a);
  b.id = 'b'; b.trialId = 'trial-b'; b.scenarioId = 'different-trial'; b.observation.value = 16;
  c.id = 'c'; c.trialId = 'trial-c';
  const r = f.validate(a, b, c); assert.equal(r.status, 'CONFLICTING_RUNTIME_EVIDENCE'); assert.equal(r.conflicts.length, 1);
  assert(r.records.every(x => x.status === 'CONFLICTING_RUNTIME_EVIDENCE')); assert.equal(f.v.proposeResolutions(r).proposals.length, 0);
  assert.deepEqual(f.validate(c, b, a).conflicts, r.conflicts);
});
test('repeated identical observations retained; claimed repetition count alone is not a formula/proposal', async () => {
  const f = await fixture(), a = f.verified(); a.confidence = 'REPEATED'; a.repetitions = 999;
  assert.equal(f.v.proposeResolutions(f.validate(a)).proposals.length, 0);
  const b = structuredClone(a); b.id = 'b'; b.trialId = 'trial-b';
  const r = f.validate(a, b), p = f.v.proposeResolutions(r); assert.equal(r.records.length, 2); assert.equal(p.proposals.length, 1);
  assert.equal(p.proposals[0].status, 'RUNTIME_CONFIRMED_PER_SETTING'); assert.equal(p.proposals[0].formula, null); assert.equal(p.productionEligible, false);
});
test('Medium/Ultra and before/after loss do not overwrite or conflict', async () => {
  const f = await fixture(), a = f.verified(), b = structuredClone(a), c = structuredClone(a);
  b.id = 'b'; b.unitSize = 'ULTRA'; b.observation.value = 16; c.id = 'c'; c.samplePoint = 'POST_LOSS'; c.observation.value = 10;
  assert.equal(f.validate(a, b, c).conflicts.length, 0);
});
test('same source/land but different contexts stay separate', async () => {
  const f = await fixture(), second = structuredClone(f.subject); second.contextId = 'supply'; second.catalogEntryId = 'ca_catalog:exact_main:supply'; f.index.subjects.push(second);
  const a = f.verified(), b = structuredClone(a); b.id = 'b'; b.contextId = second.contextId; b.catalogEntryId = second.catalogEntryId; b.observation.value = 16;
  assert.equal(f.validate(a, b).conflicts.length, 0);
});
test('weapon and entity path references validate but expected static path does not prove activation', async () => {
  const f = await fixture(), o = f.verified(); o.observationType = 'WEAPON_PATH_ACTIVE'; o.observation = { result: 'CONCLUSIVE', state: 'ACTIVE' };
  o.entityPathIds = ['entity_path']; o.missilePathIds = ['weapon_path']; o.pathBinding = 'COMPONENT_ROLE_ONLY';
  assert.equal(f.validate(o).status, 'VALIDATED'); assert.equal(f.v.proposeResolutions(f.validate(o)).proposals.length, 0);
});
test('a rejected batch never yields proposals; static and production objects/provenance remain identical', async () => {
  const f = await fixture(), a = f.verified(), b = structuredClone(a), bad = structuredClone(a), before = JSON.stringify(f.index);
  b.id = 'b'; b.trialId = 'trial-b'; bad.id = 'bad'; bad.gameVersion = 'wrong';
  assert.equal(f.v.proposeResolutions(f.validate(a, b, bad)).proposals.length, 0); assert.equal(JSON.stringify(f.index), before);
  assert.equal(f.validate(a).staticModified, false); assert.equal(f.validate(a).productionModified, false);
});
test('JSON loader preserves repeated observations and rejects malformed/oversize input', async () => {
  const f = await fixture(), dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wh3-runtime-test-'));
  try { const file = path.join(dir, 'obs.json'); await fs.writeFile(file, '\uFEFF' + JSON.stringify(f.doc(f.o))); assert.equal((await f.v.loadRuntimeEvidence(file, f.index)).records.length, 1);
    await fs.writeFile(file, '{bad'); await assert.rejects(f.v.loadRuntimeEvidence(file, f.index));
    await fs.writeFile(file, ' '.repeat(10_000_001)); await assert.rejects(f.v.loadRuntimeEvidence(file, f.index), /10 MB/);
  } finally { await fs.rm(dir, { recursive: true }); }
});
test('manual template accepts recorded jobs; pending slots are not observations', async () => {
  const f = await fixture(); const input = { format: 'warhammer-vault-runtime-recording-template-v1', jobs: [
    { status: 'PENDING', observations: [f.o] }, { status: 'RECORDED', observations: [{ ...f.o, id: 'recorded' }] },
  ] };
  assert.equal(f.v.parseRuntimeDocument(input).observations.length, 1);
  assert.equal(f.v.validateRuntimeEvidence(f.v.parseRuntimeDocument(input), f.index).status, 'VALIDATED');
  input.jobs[0].status = 'DONE'; assert.throws(() => f.v.parseRuntimeDocument(input), /status/);
});
test('identical repeated weapon observations generate only scoped proposals, no global precedence', async () => {
  const f = await fixture(), a = f.verified(); a.observationType = 'WEAPON_REPLACEMENT'; a.observation = { result: 'CONCLUSIVE', relationship: 'REPLACES' };
  a.pathBinding = 'EXACT_PATH_OBSERVED'; a.missilePathIds = ['weapon_path'];
  const b = structuredClone(a); b.id = 'b'; b.trialId = 'trial-b';
  const result = f.v.proposeResolutions(f.validate(a, b)); assert.equal(result.proposals.length, 1); assert.equal(result.proposals[0].scope, 'EXACT_SOURCE_CONTEXT_SETUP_ONLY'); assert.equal(result.proposals[0].formula, null);
});
test('wrong role of referenced exact path cannot confirm an entity or missile observation', async () => {
  const f = await fixture(), o = f.verified(); o.pathBinding = 'EXACT_PATH_OBSERVED'; o.observationType = 'WEAPON_PATH_ACTIVE'; o.observation = { result: 'CONCLUSIVE', state: 'ACTIVE' }; o.entityPathIds = ['entity_path'];
  assert.equal(f.validate(o).status, 'REJECTED'); o.observationType = 'TARGETABLE_COMPONENT'; o.entityPathIds = []; o.missilePathIds = ['weapon_path']; assert.equal(f.validate(o).status, 'REJECTED');
});
test('resolution proposals and setup comparisons ignore condition/candidate ordering while retaining every observation', async () => {
  const f = await fixture(), a = f.verified(); a.setup.skills.labels = ['B', 'A']; a.observation.notes = 'first retained note';
  const b = structuredClone(a); b.id = 'b'; b.trialId = 'trial-b'; b.setup.skills.labels.reverse(); b.observation.notes = 'second retained note';
  const first = f.validate(a, b), second = f.validate(b, a);
  assert.deepEqual(f.v.proposeResolutions(first), f.v.proposeResolutions(second)); assert.equal(first.records[0].observation.observation.notes, 'first retained note');
});
test('known effect can be recorded on a Supply context without borrowing ordinary missile paths', async () => {
  const f = await fixture(), second = structuredClone(f.subject); second.contextId = 'supply'; second.catalogEntryId = 'supply_id'; second.knownConditionKeys = []; second.missile.paths = [];
  f.index.subjects.push(second); f.o.contextId = second.contextId; f.o.catalogEntryId = second.catalogEntryId; f.o.setup.effects = { status: 'KNOWN', activeKeys: ['effect_exact'], labels: [] };
  assert.equal(f.validate(f.o).status, 'VALIDATED'); f.o.missilePathIds = ['weapon_path']; assert.equal(f.validate(f.o).status, 'REJECTED'); assert.deepEqual(second.missile.paths, []);
});
test('per-setting repeated card counts remain two proposals without any count scaling formula', async () => {
  const f = await fixture(), a = f.verified(), b = structuredClone(a), c = structuredClone(a), d = structuredClone(a);
  b.id = 'b'; b.trialId = 'trial-b'; c.id = 'c'; c.trialId = 'trial-c'; c.unitSize = 'ULTRA'; c.observation.value = 16;
  d.id = 'd'; d.trialId = 'trial-d'; d.unitSize = 'ULTRA'; d.observation.value = 16;
  const proposals = f.v.proposeResolutions(f.validate(a, b, c, d)).proposals;
  assert.equal(proposals.length, 2); assert.deepEqual(proposals.map(p => p.unitSize).sort(), ['MEDIUM', 'ULTRA']); assert(proposals.every(p => p.formula === null && !p.productionEligible));
});
test('triage is deterministic and counts all event channels without hiding omissions', async () => {
  const f = await fixture(); const channel = { channel: 'TEST', file: 'test', value: { sample: { slug: 'sample' }, normalized: { omitted: [{ field: 'entities.count', reason: 'display count unresolved' }], unmapped: [] }, exceptions: [{ category: 'IDENTITY_AMBIGUITY', fieldOrRelation: 'main', reason: 'Exact context needed.', severity: 'BLOCKED' }], coverage: { id: { status: 'FAILED', reason: 'No validated trustworthy Unit; applicability not established.' } } }, ids: [] };
  const a = f.t.generateTriage([channel], f.index), b = f.t.generateTriage([structuredClone(channel)], structuredClone(f.index)); assert.deepEqual(a, b);
  assert.equal(a.total, 4); assert.equal(a.buckets.POLICY_REQUIRED.count, 2); assert.equal(a.buckets.RUNTIME_REQUIRED.count, 2);
  assert.equal(Object.values(a.buckets).reduce((n, x) => n + x.count, 0), a.total);
});
test('production/full import draft remains closed despite known exact identities', async () => {
  const f = await fixture(), report = f.t.generateTriage([], f.index), draft = f.t.admissionDraft(f.index, report, ['empire']);
  assert.equal(draft.productionEligible, false); assert.equal(draft.fullImportGate.allowed, false); assert.equal(draft.status, 'DRAFT_NOT_APPROVED');
  assert(draft.subjects[0].runtimeRequirement.startsWith('NO_COMPOSITE_RUNTIME_REQUIREMENT'));
});
test('static index cannot silently change hash/source identities', async () => {
  const f = await fixture(), index = { format: 'warhammer-vault-runtime-static-index-v1', snapshot: f.index.snapshot, subjects: f.index.subjects };
  index.snapshotId = f.c.digest(index.snapshot); index.subjects[0].staticSnapshotId = index.snapshotId; index.integrity = f.c.digest(index);
  assert.equal(f.s.verifyIndex(index), index); index.subjects[0].sourceMainKey = 'changed'; assert.throws(() => f.s.verifyIndex(index), /integrity/);
});
