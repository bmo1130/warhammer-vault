const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = require('fengari');
const modules = Promise.all([
  import('../tools/wh3-importer/runtime-evidence/cco-probe/candidates.mjs'),
  import('../tools/wh3-importer/runtime-evidence/cco-probe/ingest.mjs'),
  import('../tools/wh3-importer/runtime-evidence/contract.mjs'),
  import('../tools/wh3-importer/runtime-evidence/cco-probe/jobs.mjs'),
  import('../tools/wh3-importer/runtime-evidence/validate.mjs'),
  import('../tools/wh3-importer/runtime-evidence/cco-probe/batch.mjs'),
]);
const V = value => ({ status: 'VALUE', value });
async function fixture() {
  const [c, i, contract, jobs, validator, batch] = await modules;
  const snapshot = { gameVersion: 'test-v1', schemaSha256: 'schema', packs: [{ name: 'db.pack', sha256: 'pack' }] }, snapshotId = contract.digest(snapshot);
  const subjects = c.P0.map(main => ({ sourceMainKey: main, sourceLandKey: `land:${main}`, contextId: null, catalogEntryId: `diag:${main}`, displayName: 'Same display name', factionId: 'fixture', gameVersion: snapshot.gameVersion, staticSnapshotId: snapshotId,
    entity: { paths: [{ pathId: `${main}:man`, role: 'MAN', entityKey: 'crew', edges: [] }, { pathId: `${main}:rider`, role: 'PERSONALITY_ATTACHMENT', entityKey: 'crew', edges: [] }] },
    missile: { paths: [{ pathId: `${main}:weapon1`, role: 'LAND_PRIMARY', weaponKey: 'gun', projectilePaths: [{ key: 'projectile1' }], rawWeaponFlags: { precursor: { value: false }, use_secondary_ammo_pool: { value: false } } },
      { pathId: `${main}:weapon2`, role: 'RIDER', weaponKey: 'gun', projectilePaths: [{ key: 'projectile2' }], rawWeaponFlags: { precursor: { value: false }, use_secondary_ammo_pool: { value: true } } }], ammo: { primary_ammo: { value: 10 }, secondary_ammo: { value: 20 } } }, knownConditionKeys: [] }));
  const body = { format: 'warhammer-vault-runtime-static-index-v1', snapshot, snapshotId, subjects }, index = { ...body, integrity: contract.digest(body) };
  const provenance = { gameVersion: snapshot.gameVersion, schemaSha256: snapshot.schemaSha256, packs: [{ file_name: 'db.pack', sha256: 'pack' }] };
  const rows = subjects.flatMap(s => [{ id: `main:${s.sourceMainKey}`, table: 'main_units_tables', tableVersion: 1, row: { unit: s.sourceMainKey, land_unit: s.sourceLandKey } },
    { id: s.sourceLandKey, table: 'land_units_tables', tableVersion: 1, row: { key: s.sourceLandKey } }]);
  const evidence = { provenance, rows, schemas: [{ table: 'main_units_tables', version: 1, fields: [{ name: 'land_unit', is_reference: ['land_units', 'key'] }] }],
    relationships: subjects.map(s => ({ from: `main:${s.sourceMainKey}`, field: 'land_unit', to: s.sourceLandKey, targetField: 'key', value: s.sourceLandKey })),
    coverage: [{ query: { table: 'land_units_to_extra_engines_tables' }, tableFiles: 1, matchedRows: 0 }], issues: [] };
  const manifest = c.buildCandidateManifest(index, evidence), subject = subjects[0];
  const metadata = { sessionId: 'session1', gameVersion: snapshot.gameVersion, staticSnapshotId: snapshotId, unitSize: 'MEDIUM', contextId: null };
  const unitFields = { 'UnitRecordContext.Key': V(subject.sourceMainKey), 'UnitRecordContext.UnitLandRecordContext.Key': V(subject.sourceLandKey), UniqueUiId: V(123),
    NumEntities: V(1), NumEntitiesInitial: V(1), HealthValue: V(5000), HealthMax: V(5000), IsPlayerUnit: V(true), IsFiringMissiles: V(true), 'ActiveProjectileContext.Key': V('projectile1'), PrimaryAmmoPercent: V(1), SecondaryAmmoPercent: V(1) };
  let seq = 0;
  const event = (kind, data, runId = 'snapshot-1') => ({ format: 'warhammer-vault-cco-probe-v1', sessionId: metadata.sessionId, runId, sequence: ++seq, kind, timestamp: V(0), metadata, data });
  const frame = (sample, fields = unitFields, run = 'snapshot-1', mode = 'SNAPSHOT') => [event(`${mode}_UNIT`, { sample, fields }, run), ...['ManList', 'MountList', 'EngineList', 'EntityList'].flatMap(list => [
    event('COMPONENT_LIST', { mode, sample, list, size: V(1), complete: true }, run), event('ENTITY', { mode, sample, list, index: 0, fields: { Key: V('crew'), 'EntityRecordContext.Key': V('crew'), 'UnitContext.UniqueUiId': V(123), IsMan: V(true), IsEngine: V(false), IsAlive: V(true), IsReloading: V(true), ReloadPercent: V(0.25) } }, run)]), event('SAMPLE_END', { mode, sample }, run)];
  const events = () => [event('SNAPSHOT_START', {}), ...frame(0), event('SNAPSHOT_END', {})];
  const parse = events => i.parseProbeLogs([{ name: 'synthetic.log', text: events.map(e => `log prefix WH3_RUNTIME_PROBE|${JSON.stringify(e)}`).join('\n') }]);
  return { c, i, contract, jobs, validator, batch, snapshot, index, evidence, manifest, subject, metadata, unitFields, event, frame, events, parse };
}
test('candidate graph preserves exact main/land, repeated entity paths, weapon paths and raw flags', async () => {
  const f = await fixture(); assert.equal(f.manifest.units.length, 4);
  assert.equal(f.manifest.units[0].views.AllMissileSources.length, 2);
  assert.equal(f.manifest.units[0].subject.entity.paths.length, 2);
  assert.notEqual(f.manifest.units[0].subject.entity.paths[0].pathId, f.manifest.units[0].subject.entity.paths[1].pathId);
  assert.equal(f.manifest.units[0].views.AllMissileSources[1].UseSecondaryAmmoPool.value, true);
  assert.equal(f.manifest.units[0].views.PrimaryAmmo.value, 10); assert.equal(f.manifest.productionEligible, false);
});
test('candidate construction refuses unconnected land, source snapshot drift and changed manifest', async () => {
  const f = await fixture(), e = structuredClone(f.evidence); e.relationships = [];
  assert.throws(() => f.c.buildCandidateManifest(f.index, e), /identity drift/);
  e.provenance.gameVersion = 'wrong'; assert.throws(() => f.c.buildCandidateManifest(f.index, e), /snapshot drift/);
  f.manifest.units[0].sourceMainKey = 'other'; assert.throws(() => f.c.verifyCandidates(f.manifest), /Invalid/);
});
test('extra engines retain each junction, entity, weapon and projectile edge; broken targets stay incomplete', async () => {
  const f = await fixture(), e = structuredClone(f.evidence), land = f.subject.sourceLandKey;
  const row = (table, id, raw) => ({ table, id, tableVersion: 1, row: raw, key: { key: raw.key }, sourcePack: 'db.pack', path: `db/${table}/fixture` });
  const engine = row('battlefield_engines_tables', 'engine-row', { key: 'engine', battle_entity: 'extra_entity', missile_weapon: 'extra_gun' });
  const entity = row('battle_entities_tables', 'entity-row', { key: 'extra_entity' });
  const weapon = row('missile_weapons_tables', 'weapon-row', { key: 'extra_gun', default_projectile: 'extra_projectile', precursor: true, use_secondary_ammo_pool: true });
  const projectile = row('projectiles_tables', 'projectile-row', { key: 'extra_projectile' });
  const extras = [0, 1].map(n => row('land_units_to_extra_engines_tables', `extra-${n}`, { key: `extra-${n}`, land_unit: land, battle_engine: 'engine', attach_articulation: n }));
  e.rows.push(engine, entity, weapon, projectile, ...extras);
  e.schemas.push({ table: extras[0].table, version: 1, fields: [{ name: 'land_unit', is_reference: ['land_units', 'key'] }, { name: 'battle_engine', is_reference: ['battlefield_engines', 'key'] }, { name: 'attach_articulation' }] },
    { table: engine.table, version: 1, fields: [{ name: 'battle_entity', is_reference: ['battle_entities', 'key'] }, { name: 'missile_weapon', is_reference: ['missile_weapons', 'key'] }] },
    { table: weapon.table, version: 1, fields: [{ name: 'default_projectile', is_reference: ['projectiles', 'key'] }, { name: 'precursor' }, { name: 'use_secondary_ammo_pool' }] });
  const edge = (from, field, to, value) => ({ from, field, to, targetField: 'key', value });
  e.relationships.push(...extras.flatMap(r => [edge(r.id, 'land_unit', land, land), edge(r.id, 'battle_engine', engine.id, 'engine')]),
    edge(engine.id, 'battle_entity', entity.id, 'extra_entity'), edge(engine.id, 'missile_weapon', weapon.id, 'extra_gun'), edge(weapon.id, 'default_projectile', projectile.id, 'extra_projectile'));
  const m = f.c.buildCandidateManifest(f.index, e), u = m.units[0]; assert.equal(u.views.ExtraEnginesList.length, 2);
  assert.equal(u.views.AllEntitySources.filter(p => p.role === 'EXTRA_ENGINE').length, 2);
  const extraWeapons = u.views.AllMissileSources.filter(p => p.role === 'EXTRA_ENGINE'); assert.equal(extraWeapons.length, 2); assert.notEqual(extraWeapons[0].pathId, extraWeapons[1].pathId);
  assert.equal(extraWeapons[0].ProjectileContextList[0].key, 'extra_projectile'); assert.equal(extraWeapons[0].UseSecondaryAmmoPool.value, true);
  e.relationships = e.relationships.filter(x => x.field !== 'default_projectile');
  assert.equal(f.c.buildCandidateManifest(f.index, e).units[0].status, 'INCOMPLETE_DB_CHAIN');
});
test('missing schema edge never recovers an extra engine from matching raw strings', async () => {
  const f = await fixture(), e = structuredClone(f.evidence);
  e.rows.push({ id: 'unbound-extra', table: 'land_units_to_extra_engines_tables', tableVersion: 1, row: { land_unit: f.subject.sourceLandKey, battle_engine: 'looks_like_engine' } });
  assert.equal(f.c.buildCandidateManifest(f.index, e).units[0].views.ExtraEnginesList.length, 0);
});
test('snapshot values stay runtime counts/health, no card count or HP formula; static data untouched', async () => {
  const f = await fixture(), before = JSON.stringify(f.index), report = f.i.compareRuns(f.parse(f.events()), f.manifest), r = f.i.toRuntimeEvidence(report, f.index);
  assert.equal(report.reports[0].entities.length, 2); assert(report.reports[0].entities.every(e => e.status === 'OBSERVED_RUNTIME'));
  assert.equal(r.validation.status, 'VALIDATED'); assert(r.evidence.observations.some(o => o.observationType === 'CCO_NUM_ENTITIES' && o.observation.value === 1));
  assert(!r.evidence.observations.some(o => o.observationType === 'CARD_MODEL_COUNT' || o.observationType === 'CARD_HEALTH'));
  assert.equal(r.resolutions.proposals.length, 0); assert.equal(JSON.stringify(f.index), before); assert.equal(report.productionModified, false);
});
test('malformed/truncated/unsupported field logs retained; unsupported does not mean absent', async () => {
  const f = await fixture(), e = f.events(); e[1].data.fields.HealthMax = { status: 'UNSUPPORTED', error: 'no method' };
  const text = e.map(x => `WH3_RUNTIME_PROBE|${JSON.stringify(x)}`).join('\n') + '\nWH3_RUNTIME_PROBE|{"bad';
  const parsed = f.i.parseProbeLogs([{ name: 'fixture', text }]); assert.equal(parsed.problems.length, 1);
  const r = f.i.toRuntimeEvidence(f.i.compareRuns(parsed, f.manifest), f.index);
  assert(!r.evidence.observations.some(o => o.observationType === 'CCO_HEALTH_MAX')); assert.equal(r.validation.status, 'VALIDATED');
  const partial = f.events().slice(0, 4), report = f.i.compareRuns(f.parse(partial), f.manifest);
  assert.equal(report.reports[0].complete, false); assert(report.reports[0].problems.includes('MISSING_RUN_END'));
});
test('repeated log ingestion is idempotent; conflicting same event is retained and blocks admission', async () => {
  const f = await fixture(), events = f.events(), duplicated = f.parse([...events, ...events]);
  assert.equal(duplicated.events.length, events.length); assert.equal(duplicated.repeats, events.length);
  const conflict = structuredClone(events[1]); conflict.data.fields.HealthMax = V(999);
  const parsed = f.parse([...events, conflict]); assert.equal(parsed.conflictKeys.length, 1);
  const report = f.i.compareRuns(parsed, f.manifest); assert.equal(report.reports[0].status, 'CONFLICTING_RUNTIME_EVIDENCE');
  assert.equal(f.i.toRuntimeEvidence(report, f.index).evidence.observations.length, 0);
});
for (const [name, mutate] of [['main identity', m => { m.data.fields['UnitRecordContext.Key'] = V('unknown'); }],
  ['land identity', m => { m.data.fields['UnitRecordContext.UnitLandRecordContext.Key'] = V('other'); }],
  ['game version', m => { m.metadata.gameVersion = 'wrong'; }], ['context', m => { m.metadata.contextId = 'roster'; }],
  ['missing UnitRecord', m => { m.data.fields['UnitRecordContext.Key'] = { status: 'NULL' }; }]])
  test(`CCO comparison fails closed for ${name}`, async () => { const f = await fixture(), events = structuredClone(f.events()); mutate(events[1]); const r = f.i.compareRuns(f.parse(events), f.manifest); assert.equal(r.reports[0].status, 'IDENTITY_PENDING'); assert.equal(f.i.toRuntimeEvidence(r, f.index).evidence.observations.length, 0); });
test('trace records projectile changes and independent pool consumption; no simultaneous/weapon attribution claim', async () => {
  const f = await fixture(), run = 'trace-1', after = structuredClone(f.unitFields); after['ActiveProjectileContext.Key'] = V('projectile2'); after.SecondaryAmmoPercent = V(0.8);
  const events = [f.event('TRACE_START', {}, run), ...f.frame(0, f.unitFields, run, 'TRACE'), ...f.frame(1, after, run, 'TRACE'), f.event('TRACE_END', { reason: 'NOMINAL_5_SECONDS_COMPLETE' }, run)];
  const r = f.i.compareRuns(f.parse(events), f.manifest).reports[0]; assert.deepEqual(r.distinctObservedProjectileKeys, ['projectile1', 'projectile2']); assert.equal(r.projectileContextTransitions.length, 1);
  assert.equal(r.ammo[0].decreaseObserved, false); assert.equal(r.ammo[1].decreaseObserved, true);
  assert.equal(r.ammo[1].candidatePathIds.length, 1); assert.equal(r.ammo[1].causalWeaponAttribution, 'INCONCLUSIVE'); assert.equal(r.simultaneousSources, 'INCONCLUSIVE');
  assert(r.missileSources.every(x => x.weaponActivationStatus === 'INCONCLUSIVE')); assert(r.reloadingEntities.length > 0);
});
test('partial trace and unsupported projectile do not become NOT_OBSERVED source conclusions', async () => {
  const f = await fixture(), fields = structuredClone(f.unitFields); fields['ActiveProjectileContext.Key'] = { status: 'NULL' };
  const report = f.i.compareRuns(f.parse([f.event('TRACE_START', {}, 'trace-1'), ...f.frame(0, fields, 'trace-1', 'TRACE')]), f.manifest);
  assert(report.reports[0].missileSources.every(x => x.projectileContextStatus === 'INCONCLUSIVE')); assert.equal(report.reports[0].complete, false);
});
test('sequence gaps and orphan compressed samples cannot establish negative coverage', async () => {
  const f = await fixture(), events = f.events(); events.splice(3, 1);
  const r = f.i.compareRuns(f.parse(events), f.manifest).reports[0]; assert.equal(r.complete, false); assert(r.problems.includes('SEQUENCE_GAP'));
  const e = [f.event('TRACE_START', {}, 'trace-2'), f.event('TRACE_UNIT', { sample: 0, unchanged: true }, 'trace-2')];
  assert(f.i.compareRuns(f.parse(e), f.manifest).reports[0].problems.includes('REPEAT_WITHOUT_BASELINE'));
});
test('cross-unit cursor and entity owners are not attributed to the selected source', async () => {
  const f = await fixture(), events = f.events(); events.filter(e => e.kind === 'ENTITY').forEach(e => { e.data.fields['UnitContext.UniqueUiId'] = V(999); });
  events.push(f.event('CURSOR', { fields: { 'UnitContext.UniqueUiId': V(999), 'UnitContext.UnitRecordContext.Key': V(f.subject.sourceMainKey), 'UnitContext.UnitRecordContext.UnitLandRecordContext.Key': V(f.subject.sourceLandKey), 'EntityRecordContext.Key': V('crew') } }));
  const r = f.i.compareRuns(f.parse(events), f.manifest).reports[0]; assert(r.entities.every(e => e.status === 'INCONCLUSIVE')); assert.equal(r.cursors[0].status, 'IDENTITY_PENDING');
});
test('CCO evidence validator rejects card conversion, out-of-range pool and malformed type without throwing', async () => {
  const f = await fixture(), r = f.i.toRuntimeEvidence(f.i.compareRuns(f.parse(f.events()), f.manifest), f.index), o = structuredClone(r.evidence.observations[0]);
  o.observation.unit = 'models'; assert.equal(f.validator.validateRuntimeEvidence({ format: f.contract.FORMAT, observations: [o] }, f.index).status, 'REJECTED');
  o.observationType = ['not-a-type']; assert.equal(f.validator.validateRuntimeEvidence({ format: f.contract.FORMAT, observations: [o] }, f.index).status, 'REJECTED');
  o.observationType = 'CCO_AMMO_PERCENT_CHANGE'; o.observation = { result: 'CONCLUSIVE', before: 100, after: 90, poolLabel: 'PrimaryAmmoPercent' };
  assert.equal(f.validator.validateRuntimeEvidence({ format: f.contract.FORMAT, observations: [o] }, f.index).status, 'REJECTED');
});
test('unknown runtime projectile is held for static followup, not evidence of a known weapon', async () => {
  const f = await fixture(), events = f.events(); events[1].data.fields['ActiveProjectileContext.Key'] = V('not_in_manifest');
  const report = f.i.compareRuns(f.parse(events), f.manifest), r = f.i.toRuntimeEvidence(report, f.index);
  assert.deepEqual(report.reports[0].unexpectedProjectileKeys, ['not_in_manifest']); assert(r.held.some(x => x.reason === 'UNREVIEWED_PROJECTILE_KEY'));
});
test('Medium and Ultra sessions are separate observations, never a scaling formula', async () => {
  const f = await fixture(), a = f.events(), b = structuredClone(a); b.forEach(e => { e.sessionId = 'session2'; e.metadata.unitSize = 'ULTRA'; }); b[1].data.fields.NumEntities = V(2);
  const r = f.i.toRuntimeEvidence(f.i.compareRuns(f.parse([...a, ...b]), f.manifest), f.index);
  assert.equal(r.validation.status, 'VALIDATED'); assert.equal(r.validation.conflicts.length, 0); assert.equal(r.resolutions.proposals.length, 0);
  assert.deepEqual([...new Set(r.evidence.observations.map(o => o.unitSize))].sort(), ['MEDIUM', 'ULTRA']);
});
test('P0 jobs require no DB inference and phase 2 remains an ungenerated plan', async () => {
  const f = await fixture(), j = f.jobs.generateProbeJobs(f.manifest); assert.equal(j.jobs.length, 8); assert(j.jobs.every(x => x.status === 'PENDING'));
  assert(j.phase2.every(x => !x.packGenerated && x.policy.candidateChangesPerTest === 1 && !x.policy.sharedVanillaEdits));
});

test('explicit size-bound manifests preserve static evidence and generate only their declared jobs',async()=>{
  const f=await fixture(),before=structuredClone(f.manifest);
  for(const size of ['SMALL','MEDIUM','LARGE','ULTRA']){
    const bound=f.c.bindUnitSize(f.manifest,size);assert.equal(f.c.verifyCandidates(bound).expectedUnitSize,size);
    assert.deepEqual(bound.units,before.units);assert.deepEqual(bound.extraEvidence,before.extraEvidence);
    const jobs=f.jobs.generateProbeJobs(bound);assert.equal(jobs.jobs.length,4);assert(jobs.jobs.every(j=>j.unitSize===size));
  }
  assert.deepEqual(f.manifest,before);
  for(const size of [undefined,'MAXIMUM',''])assert.throws(()=>f.c.bindUnitSize(f.manifest,size),/Explicit Unit Size/);
});

test('size-bound ingest quarantines either mismatch direction and metadata drift on any event',async()=>{
  const f=await fixture();
  for(const [expected,observed] of [['ULTRA','MEDIUM'],['MEDIUM','ULTRA']]){
    const manifest=f.c.bindUnitSize(f.manifest,expected),events=structuredClone(f.events());
    events.forEach(e=>{e.metadata.unitSize=observed;e.metadata.unitSizeSource='DECLARED_SETUP';});
    const before=structuredClone(events),report=f.i.compareRuns(f.parse(events),manifest),r=f.i.toRuntimeEvidence(report,f.index);
    assert.equal(report.status,'QUARANTINED_UNIT_SIZE');assert.equal(report.reports[0].complete,false);
    assert.equal(r.evidence.observations.length,0);assert.equal(r.resolutions.proposals.length,0);
    assert.equal(r.held[0].reason,'UNIT_SIZE_MISMATCH');assert.equal(r.held[0].failures[0].expected,expected);
    assert.equal(r.held[0].failures[0].observed,observed);assert.deepEqual(events,before);
    const batched=f.batch.buildRuntimeBatch([{name:'synthetic.log',text:events.map(e=>'WH3_RUNTIME_PROBE|'+JSON.stringify(e)).join('\n')}],f.index,manifest,
      {batchId:'size-mismatch',gameVersion:f.index.snapshot.gameVersion,staticSnapshotId:f.index.snapshotId,declarationReference:'fixture',
        cases:[{id:'fixture',sourceMainKey:f.subject.sourceMainKey,sourceLogs:['synthetic.log'],interpretation:'fixture'}]});
    assert.equal(batched.manifest.expectedUnitSize,expected);assert.equal(batched.manifest.unitSizeQuarantines,1);
    assert.equal(batched.evidence.observations.length,0);assert.equal(batched.manifest.cases[0].scopedCaptures,0);
  }
  for(const kind of ['SNAPSHOT_START','SNAPSHOT_UNIT','COMPONENT_LIST','ENTITY','SAMPLE_END','SNAPSHOT_END','ERROR']){
    const events=structuredClone(f.events());events.forEach(e=>{e.metadata={...e.metadata,unitSize:'ULTRA',unitSizeSource:'DECLARED_SETUP'};});
    if(kind==='ERROR')events.push({...structuredClone(events.at(-1)),kind:'ERROR',sequence:events.at(-1).sequence+1,data:{reason:'test'}});
    events.find(e=>e.kind===kind).metadata.unitSize='MEDIUM';
    const r=f.i.toRuntimeEvidence(f.i.compareRuns(f.parse(events),f.c.bindUnitSize(f.manifest,'ULTRA')),f.index);
    assert.equal(r.evidence.observations.length,0,kind);assert(r.held.some(h=>h.reason==='UNIT_SIZE_MISMATCH'&&h.failures.length===1),kind);
  }
  const malformed=structuredClone(f.events());malformed.forEach(e=>{e.metadata={...e.metadata,unitSize:'ULTRA',unitSizeSource:'DECLARED_SETUP'};});
  malformed[0].kind='INVALID';malformed[0].metadata.unitSize='MEDIUM';
  const report=f.i.compareRuns(f.parse(malformed),f.c.bindUnitSize(f.manifest,'ULTRA'));
  assert.equal(report.status,'QUARANTINED_PROBE_INPUT');assert.equal(f.i.toRuntimeEvidence(report,f.index).evidence.observations.length,0);
});

test('matching declared Ultra and Medium captures validate without scaling or rewriting historical replay',async()=>{
  const f=await fixture(),legacy=f.i.toRuntimeEvidence(f.i.compareRuns(f.parse(f.events()),f.manifest),f.index);
  assert.equal(legacy.validation.status,'VALIDATED');
  for(const size of ['ULTRA','MEDIUM','SMALL','LARGE']){
    const events=structuredClone(f.events());events.forEach(e=>{e.metadata.unitSize=size;e.metadata.unitSizeSource='DECLARED_SETUP';});
    const r=f.i.toRuntimeEvidence(f.i.compareRuns(f.parse(events),f.c.bindUnitSize(f.manifest,size)),f.index);
    assert.equal(r.validation.status,'VALIDATED');assert(r.evidence.observations.length>0);
    assert(r.evidence.observations.every(o=>o.unitSize===size));assert.equal(r.resolutions.proposals.length,0);
    assert.equal(r.evidence.observations.find(o=>o.observationType==='CCO_HEALTH_MAX').observation.value,5000);
    delete events[0].metadata.unitSizeSource;
    assert.equal(f.i.compareRuns(f.parse(events),f.c.bindUnitSize(f.manifest,size)).status,'QUARANTINED_UNIT_SIZE');
  }
});

test('CLI prepares a separate Ultra bundle without extraction and saves mismatches as quarantine with a failing exit code',async()=>{
  const f=await fixture(),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'wh3-size-cli-')),original=path.join(dir,'original'),bundle=path.join(dir,'ultra');
  const cli=path.resolve('tools/wh3-importer/runtime-evidence/cco-probe/cli.mjs');
  const run=args=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',windowsHide:true});
  try{
    await fs.mkdir(original);
    const originals={'static-index.json':JSON.stringify(f.index),'static-candidates.json':JSON.stringify(f.manifest)};
    for(const [file,bytes]of Object.entries(originals))await fs.writeFile(path.join(original,file),bytes);
    const prepared=run(['prepare','--bundle-dir',original,'--unit-size','ULTRA','--out',bundle]);assert.equal(prepared.status,0,prepared.stderr);
    const read=async(dir,file)=>JSON.parse(await fs.readFile(path.join(dir,file),'utf8'));
    assert.equal((await read(bundle,'manifest.json')).expectedUnitSize,'ULTRA');
    assert.equal((await read(bundle,'static-candidates.json')).expectedUnitSize,'ULTRA');
    assert((await read(bundle,'runtime-jobs.json')).jobs.every(j=>j.unitSize==='ULTRA'&&j.status==='PENDING'));
    const again=run(['prepare','--bundle-dir',original,'--unit-size','ULTRA','--out',bundle]);assert.notEqual(again.status,0);
    for(const observed of ['MEDIUM','ULTRA']){
      const events=structuredClone(f.events());events.forEach(e=>{e.metadata.unitSize=observed;e.metadata.unitSizeSource='DECLARED_SETUP';});
      const log=path.join(dir,observed+'.log'),out=path.join(dir,'ingest-'+observed);
      await fs.writeFile(log,events.map(e=>'WH3_RUNTIME_PROBE|'+JSON.stringify(e)).join('\n'));
      const ingested=run(['ingest','--bundle-dir',bundle,'--logs',log,'--out',out]);
      assert.equal(ingested.status,observed==='ULTRA'?0:1,ingested.stderr);
      assert.equal((await read(out,'manifest.json')).expectedUnitSize,'ULTRA');
      const evidence=await read(out,'runtime-evidence.json'),comparison=await read(out,'comparison-report.json');
      if(observed==='MEDIUM'){assert.equal(evidence.observations.length,0);assert.equal(comparison.status,'QUARANTINED_UNIT_SIZE');
        assert.equal((await read(out,'capture-triage.json')).held[0].reason,'UNIT_SIZE_MISMATCH');}
      else {assert(evidence.observations.length>0);assert(evidence.observations.every(o=>o.unitSize==='ULTRA'));}
    }
    for(const [file,bytes]of Object.entries(originals))assert.equal(await fs.readFile(path.join(original,file),'utf8'),bytes);
  }finally{assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'wh3-size-cli-'));await fs.rm(dir,{recursive:true,force:true});}
});

test('PowerShell installer requires an explicit supported size and emits matching Ultra/Medium probe metadata',{skip:process.platform!=='win32'},async()=>{
  const path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'wh3-unit-size-')),installer=path.resolve('tools/wh3-importer/runtime-evidence/cco-probe/install.ps1');
  const ps=args=>spawnSync('pwsh',['-NoProfile','-NonInteractive',...args],{encoding:'utf8',windowsHide:true});
  try{
    for(const args of [[],['-UnitSize','MAXIMUM']]){
      const invalid=ps(['-File',installer,...args]);assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/explicit -UnitSize|ValidateSet|validation|parameter/i);
    }
    const game=path.join(dir,'game');await fs.mkdir(game);await fs.copyFile(process.execPath,path.join(game,'Warhammer3.exe'));
    // Use the copied installed Node binary only as a version resource fixture;
    // it is never executed as a game.
    const actual=ps(['-Command',`[Diagnostics.FileVersionInfo]::GetVersionInfo('${process.execPath.replaceAll("'","''")}').ProductVersion.Trim()`]);
    assert.equal(actual.status,0,actual.stderr);
    for(const size of ['ULTRA','MEDIUM']){
      const bundle=path.join(dir,size),exec=path.join(dir,size+'-exec');await fs.mkdir(bundle);
      await fs.writeFile(path.join(bundle,'static-index.json'),JSON.stringify({snapshotId:'a'.repeat(64),snapshot:{gameVersion:actual.stdout.trim()}}));
      await fs.writeFile(path.join(bundle,'static-candidates.json'),JSON.stringify({snapshotId:'a'.repeat(64),expectedUnitSize:size}));
      await fs.writeFile(path.join(bundle,'manifest.json'),JSON.stringify({expectedUnitSize:size}));
      const args=['-File',installer,'-GamePath',game,'-ExecDirectory',exec,'-BundleDirectory',bundle,'-SkipLogging','-UnitSize',size];
      const installed=ps(args);assert.equal(installed.status,0,installed.stderr);
      const code=await fs.readFile(path.join(exec,'exec_battle.lua'),'utf8');assert(code.startsWith('WV_CCO_CONFIG = '));
      assert(code.includes(`unitSize = "${size}"`));assert(code.includes('unitSizeSource = "DECLARED_SETUP"'));
      const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
      const mocked=`LOG={};function out(s)LOG[#LOG+1]=s end;bm={};core={};function cco(kind)if kind=='CcoBattleRoot' then return {Call=function()return {Call=function()return nil end}end}end;return nil end;`;
      assert.equal(lauxlib.luaL_dostring(L,to_luastring(mocked+code+"\nOUTPUT=table.concat(LOG,'\\n')")),lua.LUA_OK);
      lua.lua_getglobal(L,to_luastring('OUTPUT'));const logs=to_jsstring(lua.lua_tostring(L,-1));
      const f=await fixture(),parsed=f.i.parseProbeLogs([{name:'installed-fixture.log',text:logs}]);
      assert(parsed.events.length>0);assert.equal(parsed.problems.length,0,JSON.stringify(parsed.problems));
      assert(parsed.events.every(e=>e.event.metadata.unitSize===size&&e.event.metadata.unitSizeSource==='DECLARED_SETUP'));
      const state=JSON.parse(await fs.readFile(path.join(exec,'.wv-cco-install.json'),'utf8'));assert.equal(state.expectedUnitSize,size);
      const mismatch=ps([...args.slice(0,-1),size==='ULTRA'?'MEDIUM':'ULTRA']);assert.notEqual(mismatch.status,0);assert.match(mismatch.stderr,/expected Unit Size/);
      assert.equal(await fs.readFile(path.join(exec,'exec_battle.lua'),'utf8'),code);
    }
  }finally{
    assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'wh3-unit-size-'));
    await fs.rm(dir,{recursive:true,force:true});
  }
});
for(const unitSize of ['MEDIUM','ULTRA'])test(`Lua ${unitSize} metadata on every record: safe fields, cursor, trace changes, hot reload, single listener/timer`, async () => {
  // luaL_dostring is a string loader; unlike the external-file loader it does
  // not skip a UTF-8 BOM. Preserve the canonical file bytes on disk.
  const f = await fixture(), code = (await fs.readFile('tools/wh3-importer/runtime-evidence/cco-probe/exec_battle.lua', 'utf8')).replace(/^\uFEFF/, '');
  const mock = `
LOG = {}; NOW=0; CALLBACKS={}; LISTENERS={}; SHOTS=0
function out(line) LOG[#LOG+1]=line end
bm={}; function bm:time_elapsed_ms() return NOW end
function bm:remove_real_callback(name) CALLBACKS[name]=nil end
function bm:repeat_real_callback(fn, ms, name) assert(ms==100); CALLBACKS[name]=fn end
core={}; function core:remove_listener(name) LISTENERS[name]=nil end
function core:add_listener(name, event, cond, cb, persist) assert(event=='ShortcutTriggered'); LISTENERS[name]=cb end
local main=${JSON.stringify(f.subject.sourceMainKey)}; local land=${JSON.stringify(f.subject.sourceLandKey)}
local entity={}; function entity:Call(q)
 if q=='Position' then return 1,2,3,4 end
 local v={Key='crew',['EntityRecordContext.Key']='crew', IsMan=true,IsEngine=false,IsAlive=true,IsReloading=SHOTS>0,ReloadPercent=SHOTS/100,
 ['UnitContext.UniqueUiId']=123,['UnitContext.UnitRecordContext.Key']=main,['UnitContext.UnitRecordContext.UnitLandRecordContext.Key']=land}
 if v[q]==nil then error('unsupported:'..q) end; return v[q]
end
local unit={}; function unit:Call(q)
 if q:match('%.Size$') then return 2 end
 if q:match('%.At%(') then return entity end
 local v={IsPlayerUnit=true,UniqueUiId=123,NumEntities=1,NumEntitiesInitial=1,HealthValue=5000,HealthMax=5000,
 PrimaryAmmoPercent=1-SHOTS/100,SecondaryAmmoPercent=1,IsFiringMissiles=SHOTS>0,['ActiveProjectileContext.Key']=SHOTS>25 and 'projectile2' or 'projectile1',
 ReloadPercentMax=0.5,['UnitRecordContext.Key']=main,['UnitRecordContext.UnitLandRecordContext.Key']=land,IsInMelee=false}
 if v[q]==nil then error('unsupported:'..q) end; return v[q]
end
function cco(kind, id)
 if kind=='CcoBattleSelection' then return {Call=function(self,q) assert(q=='FirstUnitContext');return unit end} end
 if kind=='CcoBattleCursorContext' then return {Call=function(self,q) assert(q=='EntityContext');return entity end} end
 if kind=='CcoBattleRoot' then return {Call=function(self,q) assert(q=='CursorContextContext');return {Call=function(self,q) assert(q=='EntityContext');return entity end} end} end
 error('unknown context')
end
WV_CCO_CONFIG={sessionId='lua-test',gameVersion='test-v1',staticSnapshotId=${JSON.stringify(f.snapshotId ?? f.index.snapshotId)},unitSize='${unitSize}',unitSizeSource='DECLARED_SETUP'}
`;
  const L = lauxlib.luaL_newstate(); lualib.luaL_openlibs(L);
  function run(s) { const status = lauxlib.luaL_dostring(L, to_luastring(s)); assert.equal(status, lua.LUA_OK, status !== lua.LUA_OK ? to_jsstring(lua.lua_tostring(L, -1)) : ''); }
  run(mock); run(code); run(`WV_CCO_PROBE.trace(); for i=1,50 do NOW=NOW+100;SHOTS=i;local fn=CALLBACKS.wv_cco_trace; if fn then fn() end end;assert(CALLBACKS.wv_cco_trace==nil)`);
  run(code); run(`WV_CCO_PROBE.trace()`); run(code);
  run(`WV_CCO_PROBE=nil; NOW=0; SHOTS=0`); run(code);
  run(`local n=0;for k in pairs(LISTENERS) do n=n+1 end;assert(n==1);assert(CALLBACKS.wv_cco_trace==nil); cco=function()return nil end; WV_CCO_CONFIG.unitSize='SMALL'; WV_CCO_PROBE.trace(); OUTPUT=table.concat(LOG,'\\n')`);
  lua.lua_getglobal(L, to_luastring('OUTPUT')); const text = to_jsstring(lua.lua_tostring(L, -1));
  const parsed = f.i.parseProbeLogs([{ name: 'real-lua-mock.log', text }]); assert.equal(parsed.problems.length, 0);
  assert(parsed.events.every(e=>e.event.metadata.unitSize===unitSize&&e.event.metadata.unitSizeSource==='DECLARED_SETUP'));
  for(const kind of ['SNAPSHOT_START','SNAPSHOT_UNIT','COMPONENT_LIST','ENTITY','CURSOR','TRACE_START','TRACE_UNIT','SAMPLE_END','SNAPSHOT_END','TRACE_END','ERROR'])assert(parsed.events.some(e=>e.event.kind===kind),kind);
  assert.equal(new Set(parsed.events.map(x => x.event.sessionId)).size, 2); assert.equal(parsed.conflictKeys.length, 0);
  const comparison = f.i.compareRuns(parsed, f.manifest), trace = comparison.reports.find(r => r.frames.length === 51);
  assert(trace); assert.equal(trace.ammo[0].decreaseObserved, true); assert.equal(trace.projectileContextTransitions.length, 1); assert(trace.reloadingEntities.length > 0);
  const cursor = comparison.reports[0].cursors[0]; assert.equal(cursor.status, 'OBSERVED_RUNTIME'); assert.equal(cursor.fields.ReloadRemainingTime.status, 'UNSUPPORTED');
  assert.equal(cursor.fields.Position.value.length, 4);
});

test('actual empty-cursor diagnostic is preserved without dropping sequence or inventing identity', async () => {
  const f = await fixture(), events = f.events();
  events.splice(events.length - 1, 0, f.event('CURSOR', { status: 'INCONCLUSIVE', reason: 'NO_ENTITY_UNDER_CURSOR', cursor: { HasIntersections: V(true) } }));
  // Event creation order determines sequence, so restore source order for this fixture.
  events.forEach((e, i) => { e.sequence = i + 1; });
  const parsed = f.parse(events), r = f.i.compareRuns(parsed, f.manifest).reports[0];
  assert.equal(parsed.problems.length, 0); assert.equal(r.complete, true);
  assert.equal(r.cursors[0].status, 'INCONCLUSIVE'); assert.deepEqual(r.cursors[0].matchingPathIds, []);
  assert(!f.i.toRuntimeEvidence(f.i.compareRuns(parsed, f.manifest), f.index).evidence.observations.some(o => o.observationType === 'CCO_CURSOR_ENTITY'));
  const unknown = structuredClone(events); unknown.find(e => e.kind === 'CURSOR').data.reason = 'UNKNOWN_CURSOR_FAILURE';
  assert.equal(f.parse(unknown).problems.length, 1);
});

test('same body in MountList and EntityList remains overlapping context views without a physical sum', async () => {
  const f = await fixture(), r = f.i.compareRuns(f.parse(f.events()), f.manifest).reports[0];
  assert(r.sharedRecordViews.some(v => v.lists.includes('MountList') && v.lists.includes('EntityList')));
  assert(r.sharedRecordViews.every(v => v.physicalIdentity === 'UNVERIFIED'));
  assert.match(r.componentCountMeaning, /do not sum/); assert.equal(r.physicalComponentCount, undefined);
});

test('12 runtime crew and 12 missile candidates never establish index pairing or simultaneous sources', async () => {
  const f = await fixture(), s = f.index.subjects[2];
  s.missile.paths = Array.from({ length: 12 }, (_, i) => ({ ...structuredClone(s.missile.paths[0]), pathId: `weapon:${i}` }));
  const { integrity, ...body } = f.index; f.index.integrity = f.contract.digest(body);
  const m = f.c.buildCandidateManifest(f.index, f.evidence), fields = structuredClone(f.unitFields);
  fields['UnitRecordContext.Key'] = V(s.sourceMainKey); fields['UnitRecordContext.UnitLandRecordContext.Key'] = V(s.sourceLandKey);
  const events = [f.event('SNAPSHOT_START', {}), ...f.frame(0, fields), f.event('SNAPSHOT_END', {})];
  const list = events.find(e => e.kind === 'COMPONENT_LIST' && e.data.list === 'ManList'); list.data.size = V(12);
  const row = events.find(e => e.kind === 'ENTITY' && e.data.list === 'ManList');
  events.splice(events.indexOf(row) + 1, 0, ...Array.from({ length: 11 }, (_, i) => ({ ...structuredClone(row), data: { ...structuredClone(row.data), index: i + 1 } })));
  events.forEach((e, i) => { e.sequence = i + 1; });
  const r = f.i.compareRuns(f.parse(events), m).reports[0];
  assert.equal(r.frames[0].lists.ManList.size.value, 12); assert.equal(r.missileSources.length, 12);
  assert.equal(r.entityIndexContinuity, 'UNVERIFIED'); assert.equal(r.simultaneousSources, 'INCONCLUSIVE');
  assert(r.missileSources.every(p => p.weaponActivationStatus === 'INCONCLUSIVE'));
  assert.equal(f.i.toRuntimeEvidence(f.i.compareRuns(f.parse(events), m), f.index).resolutions.proposals.length, 0);
});

// Synthetic envelopes, not gameplay evidence. Their shape exercises today's
// four separately declared setups against reviewed-sidecar fixture candidates.
async function batchFixture() {
  const f = await fixture(), s = { ...structuredClone(f.subject), sourceMainKey: f.batch.FREE_COMPANY, sourceLandKey: 'free-company-land', catalogEntryId: 'diag:free-company' };
  delete s.entity;
  s.missile.paths = ['baseline', 'blessed', 'exploding'].map((key, i) => ({ ...structuredClone(f.subject.missile.paths[0]),
    pathId: `free-company:${key}`, role: i ? 'MAIN_SPECIFIC_JUNCTION' : 'LAND_PRIMARY', weaponKey: `weapon:${key}`, projectilePaths: [{ key }],
    activation: { active: 'UNKNOWN', precedence: 'UNRESOLVED' } }));
  f.index.subjects.push(s); const { integrity, ...body } = f.index; f.index.integrity = f.contract.digest(body);
  f.manifest = f.c.buildCandidateManifest(f.index, f.evidence);
  const cases = ['baseline', 'blessed', 'exploding', 'both'].map((id, i) => ({ id, sourceMainKey: s.sourceMainKey, sourceLogs: [`saved:${id}.txt`],
    modifiers: { blessed: i === 1 || i === 3, exploding: i === 2 || i === 3 }, interpretation: `Human-declared ${id}` }));
  const inputs = cases.map((c, i) => {
    const fields = structuredClone(f.unitFields); fields['UnitRecordContext.Key'] = V(s.sourceMainKey);
    fields['UnitRecordContext.UnitLandRecordContext.Key'] = V(s.sourceLandKey); fields['ActiveProjectileContext.Key'] = V(i === 3 ? 'exploding' : c.id);
    const events = [f.event('SNAPSHOT_START', {}), ...f.frame(0, fields), f.event('SNAPSHOT_END', {})];
    events.forEach((e, n) => { e.sessionId = `battle:${c.id}`; e.sequence = n + 1; });
    return { name: c.sourceLogs[0], text: events.map(e => `WH3_RUNTIME_PROBE|${JSON.stringify(e)}`).join('\n') };
  });
  const declaration = { batchId: 'fixture-batch', gameVersion: f.index.snapshot.gameVersion, staticSnapshotId: f.index.snapshotId,
    declarationReference: 'Human fixture setup declaration', cases };
  const build = (ins = inputs, d = declaration) => f.batch.buildRuntimeBatch(ins, f.index, f.manifest, d);
  return { ...f, inputs, declaration, build };
}

test('Free Company four conditions remain separate observations with scoped overlap precedence', async () => {
  const f = await batchFixture(), raw = JSON.stringify(f.inputs), staticBefore = JSON.stringify(f.index), result = f.build();
  assert.equal(result.validation.status, 'VALIDATED'); assert.equal(result.validation.conflicts.length, 0);
  const active = result.evidence.observations.filter(o => o.observationType === 'CCO_ACTIVE_PROJECTILE_CONTEXT');
  assert.equal(active.length, 4); assert.equal(new Set(active.map(o => JSON.stringify(o.setup))).size, 4);
  assert.deepEqual(active.map(o => o.observation.description).sort(), ['baseline', 'blessed', 'exploding', 'exploding']);
  const precedence = result.evidence.observations.find(o => o.observationType === 'OVERRIDE_PRECEDENCE');
  assert(precedence); assert.equal(precedence.provenance.kind, 'RUNTIME_MANUAL'); assert.equal(precedence.observation.relationship, 'PRECEDES');
  assert.equal(precedence.pathBinding, 'COMPONENT_ROLE_ONLY'); assert.match(precedence.observation.notes, /this human-declared campaign setup/);
  assert.equal(result.manifest.precedence.observedProjectile, 'exploding');
  assert.equal(result.manifest.freeCompanyMatrix[0].baselineProjectile, 'baseline');
  assert.equal(result.manifest.freeCompanyMatrix[0].candidateOverrides.length, 2);
  assert.equal(result.resolutions.proposals.length, 0); assert.equal(result.manifest.productionEligible, false);
  assert.equal(JSON.stringify(f.inputs), raw); assert.equal(JSON.stringify(f.index), staticBefore);
  assert(result.comparison.reports.every(r => r.entityReviewStatus === 'NOT_REVIEWED' && r.entities.length === 0));
  assert(result.parsed.events.every(e => e.event.metadata.setup === undefined));
});

test('missing and partial inputs retain gaps and cannot manufacture a fourth state or precedence', async () => {
  const f = await batchFixture(), missing = f.build(f.inputs.slice(0, 3));
  assert.deepEqual(missing.manifest.missingInputs, ['saved:both.txt']); assert.equal(missing.manifest.precedence.status, 'INCONCLUSIVE');
  assert(!missing.evidence.observations.some(o => o.observationType === 'OVERRIDE_PRECEDENCE'));
  assert.equal(missing.manifest.freeCompanyMatrix[3].observedActiveProjectiles.length, 0);
  const partial = structuredClone(f.inputs); partial[3].text = partial[3].text.split('\n').slice(0, 3).join('\n');
  const result = f.build(partial); assert.equal(result.manifest.precedence.status, 'INCONCLUSIVE');
  assert.equal(result.manifest.freeCompanyMatrix[3].status, 'INCONCLUSIVE');
  assert(result.comparison.reports.find(r => r.declaredCaseId === 'both').problems.includes('MISSING_RUN_END'));
  assert.equal(result.resolutions.productionEligible, false);
});

test('identity/setup mismatch and conflicting replays remain held with no precedence winner', async () => {
  const f = await batchFixture(), declarations = structuredClone(f.declaration);
  declarations.cases[3].sourceMainKey = f.subject.sourceMainKey;
  delete declarations.cases[3].modifiers;
  const mismatch = f.build(f.inputs, declarations); assert.equal(mismatch.manifest.declarationProblems.length, 1);
  assert.equal(mismatch.manifest.precedence.status, 'INCONCLUSIVE');
  const inputs = structuredClone(f.inputs), events = inputs[3].text.split('\n'), altered = JSON.parse(events[1].split('WH3_RUNTIME_PROBE|')[1]);
  altered.data.fields['ActiveProjectileContext.Key'] = V('blessed');
  inputs[3].text += '\nWH3_RUNTIME_PROBE|' + JSON.stringify(altered);
  const conflict = f.build(inputs); assert.equal(conflict.parsed.conflictKeys.length, 1);
  assert(conflict.comparison.reports.some(r => r.status === 'CONFLICTING_RUNTIME_EVIDENCE'));
  assert.equal(conflict.manifest.precedence.status, 'INCONCLUSIVE'); assert.equal(conflict.resolutions.proposals.length, 0);
});

test('wrong or ambiguous overlap projectile does not prove precedence even with both declared modifiers', async () => {
  const f = await batchFixture(), inputs = structuredClone(f.inputs);
  inputs[3].text = inputs[3].text.replaceAll('"value":"exploding"', '"value":"blessed"');
  const r = f.build(inputs); assert.equal(r.manifest.precedence.status, 'INCONCLUSIVE');
  assert(!r.evidence.observations.some(o => o.observationType === 'OVERRIDE_PRECEDENCE'));
});

test('multiple F9 captures in one session are one trial and equal Necrofex pool endpoints are not decreases', async () => {
  const f = await fixture(), fields = structuredClone(f.unitFields);
  fields.PrimaryAmmoPercent = V(0.95); fields.SecondaryAmmoPercent = V(0.99);
  const events = ['snapshot-1', 'snapshot-2', 'snapshot-3'].flatMap((run, i) => {
    const e = [f.event('SNAPSHOT_START', {}, run), ...f.frame(0, fields, run), f.event('SNAPSHOT_END', {}, run)];
    e.forEach(x => { x.timestamp = V(i * 2000); });
    e.filter(x => x.kind === 'ENTITY' && x.data.list === 'ManList').forEach(x => { x.data.fields.ReloadRemainingTime = V(7 - i); });
    return e;
  });
  const input = { name: 'saved:necrofex.txt', text: events.map(e => `WH3_RUNTIME_PROBE|${JSON.stringify(e)}`).join('\n') };
  const r = f.batch.buildRuntimeBatch([input], f.index, f.manifest, { batchId: 'fixture', gameVersion: f.index.snapshot.gameVersion,
    staticSnapshotId: f.index.snapshotId, declarationReference: 'human fixture', cases: [{ id: 'necrofex', sourceMainKey: f.subject.sourceMainKey, sourceLogs: [input.name], interpretation: 'fixture' }] });
  const series = r.manifest.cases[0].snapshotSeries[0]; assert(series.ammo.every(a => a.first < 1 && a.last < 1 && !a.decreaseObserved));
  assert.equal(series.reloadRemainingTimeChanges.length, 2); assert(series.reloadRemainingTimeChanges.every(c => c.decreaseObserved && c.entityContinuity === 'UNVERIFIED_LIST_INDEX'));
  assert.equal(new Set(r.evidence.observations.map(o => o.trialId)).size, 1);
  assert.equal(r.resolutions.proposals.length, 0);
});
